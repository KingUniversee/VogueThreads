import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Customer from "@/models/Customer";
import Order from "@/models/Order";
import Segment from "@/models/Segment";
import AuditLog from "@/models/AuditLog";
import { getCustomerPurchasingMetrics } from "@/lib/customer-service";
import { doesCustomerMatchSegment } from "@/lib/segment-service";

/**
 * GET /api/customers/[id]
 * Fetch single customer details, live purchasing metrics, and segment memberships
 */
export async function GET(request, { params }) {
  try {
    await assertPermission("customers.read");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 });
    }

    const customer = await Customer.findOne({ _id: id, isDeleted: { $ne: true } }).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: `Customer '${id}' not found` }, { status: 404 });
    }

    // Compute live metrics from Orders
    const metrics = await getCustomerPurchasingMetrics(customer._id, customer.email);

    // Find qualifying segments
    const allSegments = await Segment.find({ status: "ACTIVE" }).lean();
    const activeSegments = allSegments
      .filter((seg) => doesCustomerMatchSegment(customer, seg, metrics))
      .map((s) => ({ _id: s._id, name: s.name, type: s.type, slug: s.slug }));

    return NextResponse.json({
      success: true,
      customer,
      metrics,
      segments: activeSegments,
    });
  } catch (error) {
    console.error("❌ [API /api/customers/[id] GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch customer" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/customers/[id]
 * Update customer profile details
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission("customers.update");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 });
    }

    const customer = await Customer.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!customer) {
      return NextResponse.json({ success: false, error: `Customer '${id}' not found` }, { status: 404 });
    }

    const body = await request.json();
    const { name, firstName, lastName, phone, tags, acceptsMarketing, status } = body;

    const previousState = {
      name: customer.name,
      phone: customer.phone,
      status: customer.status,
    };

    const resolvedName = (name || [firstName, lastName].filter(Boolean).join(" ")).trim();
    if (resolvedName) customer.name = resolvedName;
    if (phone !== undefined) customer.phone = phone ? phone.trim() : "";
    if (Array.isArray(tags)) customer.tags = tags;
    if (acceptsMarketing !== undefined) customer.acceptsMarketing = Boolean(acceptsMarketing);
    if (status && ["ACTIVE", "INACTIVE", "BLOCKED"].includes(status)) {
      customer.status = status;
    }

    await customer.save();

    // AuditLog
    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: "CUSTOMER_UPDATE",
        resource: "Customer",
        resourceId: String(customer._id),
        details: {
          before: previousState,
          after: { name: customer.name, phone: customer.phone, status: customer.status },
        },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("❌ [API /api/customers/[id] PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update customer" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]
 * Safe soft-archive guard: strictly prevents physical deletion if historical orders exist
 */
export async function DELETE(request, { params }) {
  try {
    const user = await assertPermission("customers.update");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ success: false, error: `Customer '${id}' not found` }, { status: 404 });
    }

    // Check if customer has orders
    const orderCount = await Order.countDocuments({
      $or: [
        { customerId: customer._id },
        { "customerDetails.email": customer.email },
      ],
    });

    // Enforce Historical Record Preservation
    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.status = "INACTIVE";
    await customer.save();

    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: "CUSTOMER_ARCHIVE",
        resource: "Customer",
        resourceId: String(customer._id),
        details: {
          email: customer.email,
          retainedOrdersCount: orderCount,
          action: "Soft archived to preserve order history",
        },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      message: `Customer ${customer.name} safely archived. Historical order records (${orderCount}) preserved.`,
    });
  } catch (error) {
    console.error("❌ [API /api/customers/[id] DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete customer" },
      { status: error.status || 500 }
    );
  }
}
