import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Order from "@/models/Order";
import AuditLog from "@/models/AuditLog";
import { isOrderReturnable } from "@/lib/order-status";
import { restockReturnedItems } from "@/lib/order-service";

/**
 * POST /api/orders/[id]/return
 * Process an item return with optional warehouse restock
 */
export async function POST(request, { params }) {
  try {
    const user = await assertPermission("returns.manage");
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const { items = [], restock = false, refundAmount = 0, notes = "" } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one item must be selected for return" },
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

    if (!isOrderReturnable(order.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Order '${order.orderNumber}' is in '${order.status}' status and is not eligible for return.`,
        },
        { status: 400 }
      );
    }

    const actorEmail = user.email || "admin@voguethreads.in";
    const returnId = `RET-${Date.now().toString().slice(-6)}`;

    // If restock requested, return items into inventory
    if (restock) {
      await restockReturnedItems(order, items, user);
    }

    const returnRecord = {
      returnId,
      items: items.map((i) => ({
        sku: i.sku.trim().toUpperCase(),
        quantity: Number(i.quantity) || 1,
        reason: i.reason || "Customer return",
        condition: i.condition || "GOOD",
      })),
      status: restock ? "RESTOCKED" : "APPROVED",
      refundAmount: Number(refundAmount) || 0,
      requestedAt: new Date(),
      processedAt: new Date(),
      restocked: Boolean(restock),
      notes,
    };

    order.returns.push(returnRecord);
    order.status = "RETURNED";

    // Add to timeline
    order.timeline.push({
      event: "RETURN_PROCESSED",
      title: `Return Processed (${returnId})`,
      description: `Return processed for ${items.length} item(s). ${
        restock ? "Items restocked into inventory." : "No restock."
      }`,
      actorEmail,
      timestamp: new Date(),
      metadata: { returnId, itemsCount: items.length, restock, refundAmount },
    });

    order.statusHistory.push({
      status: "RETURNED",
      timestamp: new Date(),
      note: `Return ${returnId} processed: ${items.length} item(s) (${restock ? "Restocked" : "Inspected"})`,
      actor: actorEmail,
    });

    await order.save();

    // AuditLog
    try {
      await AuditLog.create({
        actorId: user.id ? new mongoose.Types.ObjectId(user.id) : undefined,
        actorEmail,
        action: "ORDER_RETURN",
        resource: "Order",
        resourceId: String(order._id),
        details: {
          orderNumber: order.orderNumber,
          returnId,
          restock,
          refundAmount,
        },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      order,
      returnRecord,
    });
  } catch (error) {
    console.error("❌ [API /api/orders/[id]/return POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process return" },
      { status: error.status || 500 }
    );
  }
}
