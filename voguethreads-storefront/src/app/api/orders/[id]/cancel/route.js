import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import Order from "@/models/Order";
import { getSession } from "@/lib/auth";

/**
 * POST /api/orders/[id]/cancel
 * Securely cancels an existing order in MongoDB.
 * Requires:
 *  1. Valid authenticated session (vt_session cookie)
 *  2. Existing order in database (returns 404 if not found)
 *  3. Strict ownership verification (session.userId === order.customerId)
 */
export async function POST(request, { params }) {
  try {
    // 1. Enforce authentication
    const session = await getSession(request);
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to cancel an order." },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason = "Customer Requested Cancellation", notes = "" } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Order identifier is required" },
        { status: 400 }
      );
    }

    const cleanId = decodeURIComponent(id).trim();
    const strippedId = cleanId.replace(/^#/, "");

    const query = {
      $or: [
        { orderNumber: new RegExp(`^${strippedId}$`, "i") },
        { orderNumber: new RegExp(`^${cleanId}$`, "i") },
      ],
    };

    if (mongoose.Types.ObjectId.isValid(strippedId)) {
      query.$or.push({ _id: strippedId });
    }

    // 2. Fetch existing order (no auto-import from body.orderData)
    const order = await Order.findOne(query);

    if (!order) {
      return NextResponse.json(
        { success: false, error: `Order '${cleanId}' not found` },
        { status: 404 }
      );
    }

    // 3. Ownership Authorization Check (session.userId === order.customerId)
    if (!order.customerId || session.userId !== order.customerId.toString()) {
      return NextResponse.json(
        { success: false, error: "Forbidden. You do not have permission to cancel this order." },
        { status: 403 }
      );
    }

    // 4. Status Validation: check if order is already shipped, delivered, or cancelled
    const currentStatus = (order.status || "").toUpperCase();
    const nonCancellableStatuses = ["SHIPPED", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"];

    if (nonCancellableStatuses.includes(currentStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Order '${order.orderNumber}' cannot be cancelled because its current status is '${order.status}'.`,
        },
        { status: 400 }
      );
    }

    const actor = session.email || order.customerDetails?.email || "customer";

    // 5. Apply cancellation
    order.status = "CANCELLED";
    order.cancellation = {
      reason,
      cancelledBy: actor,
      cancelledAt: new Date(),
      notes: notes.trim(),
    };

    if (!Array.isArray(order.timeline)) {
      order.timeline = [];
    }
    order.timeline.push({
      event: "ORDER_CANCELLED",
      title: "Order Cancelled by Customer",
      description: `Order cancelled. Reason: ${reason}${notes ? ` (${notes})` : ""}`,
      actorEmail: actor,
      timestamp: new Date(),
    });

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: "CANCELLED",
      timestamp: new Date(),
      note: `Cancelled: ${reason}`,
      actor: "CUSTOMER",
    });

    // Update payment refund status if paid
    if (order.payment && order.payment.status === "PAID") {
      order.payment.status = "REFUND_PENDING";
    }

    await order.save();

    return NextResponse.json({
      success: true,
      message: `Order #${order.orderNumber} has been successfully cancelled.`,
      orderNumber: order.orderNumber,
      order,
    });
  } catch (error) {
    console.error("POST /api/orders/[id]/cancel error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel order" },
      { status: 500 }
    );
  }
}
