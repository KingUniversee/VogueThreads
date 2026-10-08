import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Customer from "@/models/Customer";
import AuditLog from "@/models/AuditLog";

/**
 * PATCH /api/customers/[id]/status
 * Change customer account status (ACTIVE, INACTIVE, BLOCKED)
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission("customers.update");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status, reason = "" } = body;

    const validStatuses = ["ACTIVE", "INACTIVE", "BLOCKED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!customer) {
      return NextResponse.json({ success: false, error: `Customer '${id}' not found` }, { status: 404 });
    }

    const previousStatus = customer.status;
    customer.status = status;
    await customer.save();

    // AuditLog
    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: "CUSTOMER_STATUS_CHANGE",
        resource: "Customer",
        resourceId: String(customer._id),
        details: {
          email: customer.email,
          before: previousStatus,
          after: status,
          reason,
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
    console.error("❌ [API /api/customers/[id]/status PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to change customer status" },
      { status: error.status || 500 }
    );
  }
}
