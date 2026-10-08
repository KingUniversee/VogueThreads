import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission, getSessionUser } from "@/lib/auth";
import Order from "@/models/Order";
import { createOrder, getOrderMetrics } from "@/lib/order-service";

/**
 * GET /api/orders
 * List orders with search, filtering, sorting, pagination, and telemetry summary.
 */
export async function GET(request) {
  try {
    await assertPermission("orders.read");
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const paymentStatus = searchParams.get("paymentStatus") || "ALL";
    const paymentMethod = searchParams.get("paymentMethod") || "ALL";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build filter query
    const filter = {};

    // Status filter
    if (status && status !== "ALL") {
      // Support grouping like PAID_OR_CONFIRMED if needed, or exact status
      if (status === "PAID_OR_CONFIRMED") {
        filter.status = { $in: ["CONFIRMED", "PAID"] };
      } else {
        filter.status = status;
      }
    }

    // Payment status filter
    if (paymentStatus && paymentStatus !== "ALL") {
      filter["payment.status"] = paymentStatus;
    }

    // Payment method filter
    if (paymentMethod && paymentMethod !== "ALL") {
      filter["payment.method"] = paymentMethod;
    }

    // Search filter across orderNumber, customer name, email, phone, or SKU
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { orderNumber: searchRegex },
        { "customerDetails.name": searchRegex },
        { "customerDetails.email": searchRegex },
        { "customerDetails.phone": searchRegex },
        { "items.sku": searchRegex },
        { "items.title": searchRegex },
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [orders, totalCount, metrics] = await Promise.all([
      Order.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
      getOrderMetrics(),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
      metrics,
    });
  } catch (error) {
    console.error("❌ [API /api/orders GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch orders" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create a new order with stock validation and reservation
 */
export async function POST(request) {
  try {
    const user = await getSessionUser();
    // Allow either authenticated admin user or pass through for storefront
    await connectToDatabase();

    const body = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one item is required to create an order" },
        { status: 400 }
      );
    }

    if (!body.customerDetails || !body.customerDetails.name || !body.customerDetails.email) {
      return NextResponse.json(
        { success: false, error: "Customer name and email are required" },
        { status: 400 }
      );
    }

    if (!body.shippingAddress || !body.shippingAddress.addressLine1 || !body.shippingAddress.city) {
      return NextResponse.json(
        { success: false, error: "Valid shipping address is required" },
        { status: 400 }
      );
    }

    const order = await createOrder(body, user);

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("❌ [API /api/orders POST] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create order",
        details: error.details,
      },
      { status: error.status || 500 }
    );
  }
}
