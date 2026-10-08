import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Order from "@/models/Order";
import AuditLog from "@/models/AuditLog";
import { isOrderCancellable } from "@/lib/order-status";
import { releaseOrderStock } from "@/lib/order-service";
import { sendOrderCancelledEmail } from "@/lib/mailer";

/**
 * POST /api/orders/[id]/cancel
 * Cancel an order and release reserved warehouse inventory
 */
export async function POST(request, { params }) {
  try {
    const user = await assertPermission("orders.update");
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const { reason = "Customer Request", notes = "" } = body;

    let order = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id);
    }
    if (!order) {
      order = await Order.findOne({ orderNumber: id.trim().toUpperCase() });
    }

    if (!order) {
      return NextResponse.json({ success: false, error: `Order '${id}' not found` }, { status: 404 });
    }

    if (!isOrderCancellable(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Order '${order.orderNumber}' cannot be cancelled because it is in '${order.status}' status.`,
        },
        { status: 400 }
      );
    }

    const actorEmail = user.email || "admin@voguethreads.in";
    const previousStatus = order.status;

    // Record cancellation details
    order.cancellation = {
      reason,
      cancelledBy: actorEmail,
      cancelledAt: new Date(),
      notes,
    };

    // Release reserved inventory safely
    await releaseOrderStock(order, user);

    order.status = "CANCELLED";

    // Add to timeline
    order.timeline.push({
      event: "ORDER_CANCELLED",
      title: "Order Cancelled",
      description: `Order cancelled by ${actorEmail}. Reason: ${reason}`,
      actorEmail,
      timestamp: new Date(),
      metadata: { reason, notes, previousStatus },
    });

    order.statusHistory.push({
      status: "CANCELLED",
      timestamp: new Date(),
      note: `Cancelled: ${reason}${notes ? ` - ${notes}` : ""}`,
      actor: actorEmail,
    });

    await order.save();

    // Asynchronously dispatch order cancellation email
    try {
      sendOrderCancelledEmail({ order }).catch((err) =>
        console.error("❌ Failed to send order cancelled email:", err)
      );
    } catch (mailErr) {
      console.error("❌ Non-fatal order cancel email error:", mailErr);
    }

    // Record AuditLog
    try {
      await AuditLog.create({
        actorId: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
        actorEmail,
        action: "ORDER_CANCEL",
        resource: "Order",
        resourceId: String(order._id),
        details: {
          orderNumber: order.orderNumber,
          reason,
          notes,
          previousStatus,
        },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("❌ [API /api/orders/[id]/cancel POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel order" },
      { status: error.status || 500 }
    );
  }
}
