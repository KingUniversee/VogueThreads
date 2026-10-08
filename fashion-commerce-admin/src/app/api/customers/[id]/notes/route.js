import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Customer from "@/models/Customer";

/**
 * POST /api/customers/[id]/notes
 * Add internal staff CRM note to customer profile
 */
export async function POST(request, { params }) {
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
    const { note } = body;

    if (!note || !note.trim()) {
      return NextResponse.json({ success: false, error: "Note content cannot be empty" }, { status: 400 });
    }

    const noteRecord = {
      noteId: `cnote_${Date.now().toString().slice(-6)}`,
      note: note.trim(),
      authorEmail: user.email || "admin@voguethreads.in",
      createdAt: new Date(),
    };

    if (!customer.adminNotes) customer.adminNotes = [];
    customer.adminNotes.unshift(noteRecord);

    await customer.save();

    return NextResponse.json({
      success: true,
      notes: customer.adminNotes,
    });
  } catch (error) {
    console.error("❌ [API /api/customers/[id]/notes POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add customer note" },
      { status: error.status || 500 }
    );
  }
}
