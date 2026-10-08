import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Order from "@/models/Order";

/**
 * POST /api/orders/[id]/notes
 * Add internal staff note to an order
 */
export async function POST(request, { params }) {
  try {
    const user = await assertPermission("orders.update");
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const { note } = body;

    if (!note || !note.trim()) {
      return NextResponse.json({ success: false, error: "Note content cannot be empty" }, { status: 400 });
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

    const actorEmail = user.email || "admin@voguethreads.in";
    const noteRecord = {
      noteId: `note_${Date.now().toString().slice(-6)}`,
      note: note.trim(),
      authorEmail: actorEmail,
      createdAt: new Date(),
    };

    if (!order.adminNotes) {
      order.adminNotes = [];
    }
    order.adminNotes.unshift(noteRecord);

    await order.save();

    return NextResponse.json({
      success: true,
      notes: order.adminNotes,
    });
  } catch (error) {
    console.error("❌ [API /api/orders/[id]/notes POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add internal note" },
      { status: error.status || 500 }
    );
  }
}
