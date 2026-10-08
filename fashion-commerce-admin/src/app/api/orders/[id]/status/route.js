import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Order from "@/models/Order";
import AuditLog from "@/models/AuditLog";
import { canTransition, getNextAvailableStatuses } from "@/lib/order-status";
import { commitOrderStock, reserveOrderStock } from "@/lib/order-service";
import {
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancelledEmail,
} from "@/lib/mailer";

/**
 * PATCH /api/orders/[id]/status
 * Advance or transition an order's lifecycle status
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission("orders.update");
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const { status: targetStatus, note = "", carrier, awbNumber, trackingUrl, estimatedDelivery } = body;

    if (!targetStatus) {
      return NextResponse.json({ success: false, error: "Target status is required" }, { status: 400 });
    }

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

    const currentStatus = order.status;

    // Validate transition
    if (!canTransition(currentStatus, targetStatus)) {
      const allowed = getNextAvailableStatuses(currentStatus);
      return NextResponse.json(
        {
          success: false,
          error: `Cannot transition order from '${currentStatus}' to '${targetStatus}'. Allowed next transitions: ${
            allowed.length > 0 ? allowed.join(", ") : "None (Terminal State)"
          }`,
        },
        { status: 400 }
      );
    }

    const actorEmail = user.email || "admin@voguethreads.in";
    const previousStatus = currentStatus;

    // Execute side-effects according to target status
    if (targetStatus === "CONFIRMED" || targetStatus === "PAID") {
      await reserveOrderStock(order, user);
      if (targetStatus === "PAID") {
        order.payment.status = "PAID";
        order.payment.paidAt = new Date();
      }
    }

    if (targetStatus === "SHIPPED") {
      // Commit physical warehouse stock deduction
      await commitOrderStock(order, user);

      // Update fulfillment details
      if (carrier) order.fulfillment.carrier = carrier;
      if (awbNumber) order.fulfillment.awbNumber = awbNumber.trim().toUpperCase();
      if (trackingUrl) order.fulfillment.trackingUrl = trackingUrl.trim();
      if (estimatedDelivery) order.fulfillment.estimatedDelivery = new Date(estimatedDelivery);
      order.fulfillment.shippedAt = new Date();
    }

    if (targetStatus === "DELIVERED") {
      order.fulfillment.deliveredAt = new Date();
      if (order.payment.method === "COD" && order.payment.status !== "PAID") {
        order.payment.status = "PAID";
        order.payment.paidAt = new Date();
      }
    }

    // Apply status update
    order.status = targetStatus;

    // Add to timeline
    order.timeline.push({
      event: "STATUS_UPDATED",
      title: `Status changed to ${targetStatus}`,
      description: note || `Order advanced from ${previousStatus} to ${targetStatus}`,
      actorEmail,
      timestamp: new Date(),
      metadata: { previousStatus, newStatus: targetStatus },
    });

    // Add to status history
    order.statusHistory.push({
      status: targetStatus,
      timestamp: new Date(),
      note: note || `Transitioned to ${targetStatus}`,
      actor: actorEmail,
    });

    await order.save();

    // Asynchronously dispatch status change notifications
    try {
      if (targetStatus === "SHIPPED") {
        sendOrderShippedEmail({ order }).catch((err) =>
          console.error("❌ Failed to send order shipped email:", err)
        );
      } else if (targetStatus === "DELIVERED") {
        sendOrderDeliveredEmail({ order }).catch((err) =>
          console.error("❌ Failed to send order delivered email:", err)
        );
      } else if (targetStatus === "CANCELLED") {
        sendOrderCancelledEmail({ order }).catch((err) =>
          console.error("❌ Failed to send order cancelled email:", err)
        );
      }
    } catch (mailErr) {
      console.error("❌ Non-fatal order status email error:", mailErr);
    }

    // Record administrative AuditLog
    try {
      await AuditLog.create({
        actorId: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
        actorEmail,
        action: "ORDER_STATUS_UPDATE",
        resource: "Order",
        resourceId: String(order._id),
        details: {
          orderNumber: order.orderNumber,
          before: { status: previousStatus },
          after: { status: targetStatus },
          note,
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
    console.error("❌ [API /api/orders/[id]/status PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update order status" },
      { status: error.status || 500 }
    );
  }
}
