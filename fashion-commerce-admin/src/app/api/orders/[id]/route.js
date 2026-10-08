import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Order from "@/models/Order";

/**
 * GET /api/orders/[id]
 * Fetch single order details by MongoDB _id or human-readable orderNumber
 */
export async function GET(request, { params }) {
  try {
    await assertPermission("orders.read");
    await connectToDatabase();

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }

    let order = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      order = await Order.findById(id).lean();
    }

    if (!order) {
      order = await Order.findOne({
        orderNumber: id.trim().toUpperCase(),
      }).lean();
    }

    if (!order) {
      return NextResponse.json({ success: false, error: `Order '${id}' not found` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("❌ [API /api/orders/[id] GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch order" },
      { status: error.status || 500 }
    );
  }
}
