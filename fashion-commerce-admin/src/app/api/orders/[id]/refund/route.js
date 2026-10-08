import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Order from "@/models/Order";
import AuditLog from "@/models/AuditLog";

/**
 * POST /api/orders/[id]/refund
 * Process refund against customer order
 */
export async function POST(request, { params }) {
  try {
    const user = await assertPermission("orders.refund");
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const { amount, reason = "Customer refund", reference = "" } = body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Refund amount must be greater than zero" },
        { status: 400 }
      );
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

    const grandTotal = Number(order.pricing?.grandTotal) || 0;
    const existingRefundTotal = (order.refunds || []).reduce(
      (acc, r) => acc + (Number(r.amount) || 0),
      0
    );

    if (existingRefundTotal + parsedAmount > grandTotal) {
      return NextResponse.json(
        {
          success: false,
          error: `Total refund amount cannot exceed order grand total of ₹${grandTotal}. Already refunded: ₹${existingRefundTotal}.`,
        },
        { status: 400 }
      );
    }

    const actorEmail = user.email || "admin@voguethreads.in";
    const refundId = `REF-${Date.now().toString().slice(-6)}`;

    const refundRecord = {
      refundId,
      amount: parsedAmount,
      reason,
      status: "PROCESSED",
      reference: reference.trim(),
      initiatedAt: new Date(),
      actorEmail,
    };

    order.refunds.push(refundRecord);

    const newRefundTotal = existingRefundTotal + parsedAmount;
    if (newRefundTotal >= grandTotal) {
      order.payment.status = "REFUNDED";
      if (order.status === "RETURNED" || order.status === "CANCELLED") {
        order.status = "REFUNDED";
      }
    } else {
      order.payment.status = "PARTIALLY_REFUNDED";
    }

    // Add to timeline
    order.timeline.push({
      event: "REFUND_ISSUED",
      title: `Refund Issued (₹${parsedAmount.toLocaleString("en-IN")})`,
      description: `Refund ${refundId} issued by ${actorEmail}. Reason: ${reason}`,
      actorEmail,
      timestamp: new Date(),
      metadata: { refundId, amount: parsedAmount, reference },
    });

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      note: `Refund ${refundId} issued for ₹${parsedAmount}`,
      actor: actorEmail,
    });

    await order.save();

    // AuditLog
    try {
      await AuditLog.create({
        actorId: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
        actorEmail,
        action: "ORDER_REFUND",
        resource: "Order",
        resourceId: String(order._id),
        details: {
          orderNumber: order.orderNumber,
          refundId,
          amount: parsedAmount,
          reason,
        },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      order,
      refundRecord,
    });
  } catch (error) {
    console.error("❌ [API /api/orders/[id]/refund POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to issue refund" },
      { status: error.status || 500 }
    );
  }
}
