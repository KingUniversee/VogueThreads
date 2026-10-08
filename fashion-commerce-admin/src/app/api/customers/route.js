import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Customer from "@/models/Customer";
import Order from "@/models/Order";
import Segment from "@/models/Segment";
import AuditLog from "@/models/AuditLog";
import {
  syncCustomersFromOrders,
  getCustomerListMetrics,
  getCustomerPurchasingMetrics,
  getBatchCustomerPurchasingMetrics,
} from "@/lib/customer-service";
import { getSegmentMembers } from "@/lib/segment-service";

/**
 * GET /api/customers
 * List customers with search, status filtering, behavior filtering, segment filtering, sorting, and pagination
 */
export async function GET(request) {
  try {
    await assertPermission("customers.read");
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const behavior = searchParams.get("behavior") || "ALL";
    const segmentId = searchParams.get("segment") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    // Handle segment-based filtering if requested
    if (segmentId && segmentId !== "ALL") {
      const segmentResult = await getSegmentMembers(segmentId, { page, limit, search });
      const metrics = await getCustomerListMetrics();
      return NextResponse.json({
        success: true,
        customers: segmentResult.members,
        pagination: {
          page,
          limit,
          total: segmentResult.totalCount,
          totalPages: segmentResult.totalPages,
        },
        metrics,
      });
    }

    const filter = { isDeleted: { $ne: true } };

    if (status && status !== "ALL") {
      filter.status = status;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }

    // Fetch customers
    let query = Customer.find(filter);

    // If sorting by customer table fields
    if (sortBy === "name" || sortBy === "createdAt") {
      query = query.sort({ [sortBy]: sortOrder });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const skip = (page - 1) * limit;

    const [rawCustomers, totalCount, metrics] = await Promise.all([
      query.skip(skip).limit(limit).lean(),
      Customer.countDocuments(filter),
      getCustomerListMetrics(),
    ]);

    // Attach real purchasing metrics for all customers on the current page in a single batch query
    const pageMetricsMap = await getBatchCustomerPurchasingMetrics(rawCustomers);
    let customersWithMetrics = rawCustomers.map((c) => {
      const idStr = c._id?.toString();
      const metrics = pageMetricsMap.get(idStr) || {
        totalOrders: 0,
        totalSpend: 0,
        avgOrderValue: 0,
        itemsPurchased: 0,
        firstOrderDate: null,
        lastOrderDate: null,
        cancelledOrders: 0,
      };
      return {
        ...c,
        metrics,
      };
    });

    // Handle in-memory behavior filtering and spend/orders sorting if requested
    if (behavior !== "ALL") {
      customersWithMetrics = customersWithMetrics.filter((c) => {
        if (behavior === "HAS_ORDERS") return (c.metrics.totalOrders || 0) > 0;
        if (behavior === "NO_ORDERS") return (c.metrics.totalOrders || 0) === 0;
        if (behavior === "HIGH_VALUE") return (c.metrics.totalSpend || 0) >= 10000;
        if (behavior === "REPEAT_BUYER") return (c.metrics.totalOrders || 0) >= 2;
        return true;
      });
    }

    if (sortBy === "totalSpend") {
      customersWithMetrics.sort((a, b) =>
        sortOrder === 1
          ? (a.metrics.totalSpend || 0) - (b.metrics.totalSpend || 0)
          : (b.metrics.totalSpend || 0) - (a.metrics.totalSpend || 0)
      );
    } else if (sortBy === "orderCount") {
      customersWithMetrics.sort((a, b) =>
        sortOrder === 1
          ? (a.metrics.totalOrders || 0) - (b.metrics.totalOrders || 0)
          : (b.metrics.totalOrders || 0) - (a.metrics.totalOrders || 0)
      );
    } else if (sortBy === "avgOrderValue") {
      customersWithMetrics.sort((a, b) =>
        sortOrder === 1
          ? (a.metrics.avgOrderValue || 0) - (b.metrics.avgOrderValue || 0)
          : (b.metrics.avgOrderValue || 0) - (a.metrics.avgOrderValue || 0)
      );
    }

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      customers: customersWithMetrics,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
      metrics,
    });
  } catch (error) {
    console.error("❌ [API /api/customers GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch customers" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/customers
 * Create a new customer profile
 */
export async function POST(request) {
  try {
    const user = await assertPermission("customers.update");
    await connectToDatabase();

    const body = await request.json();
    const {
      name,
      firstName,
      lastName,
      email,
      phone,
      status = "ACTIVE",
      addresses = [],
      tags = [],
      acceptsMarketing = false,
    } = body;

    const resolvedName = (name || [firstName, lastName].filter(Boolean).join(" ")).trim();

    if (!resolvedName) {
      return NextResponse.json(
        { success: false, error: "Customer name is required" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Customer email is required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await Customer.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Customer with email '${cleanEmail}' already exists` },
        { status: 409 }
      );
    }

    const newCustomer = await Customer.create({
      name: resolvedName,
      email: cleanEmail,
      phone: phone ? phone.trim() : undefined,
      status,
      addresses,
      tags,
      acceptsMarketing: Boolean(acceptsMarketing),
      adminNotes: [],
    });

    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: "CUSTOMER_CREATE",
        resource: "Customer",
        resourceId: String(newCustomer._id),
        details: { name: newCustomer.name, email: newCustomer.email },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      customer: newCustomer,
    });
  } catch (error) {
    console.error("❌ [API /api/customers POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create customer" },
      { status: error.status || 500 }
    );
  }
}
