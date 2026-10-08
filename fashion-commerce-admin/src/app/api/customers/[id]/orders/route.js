import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Customer from "@/models/Customer";
import Order from "@/models/Order";

/**
 * GET /api/customers/[id]/orders
 * Fetch paginated list of real orders placed by this customer
 */
export async function GET(request, { params }) {
  try {
    await assertPermission("customers.read");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid customer ID" }, { status: 400 });
    }

    const customer = await Customer.findById(id).lean();
    if (!customer) {
      return NextResponse.json({ success: false, error: `Customer '${id}' not found` }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "10", 10)));

    const filter = {
      $or: [
        { customerId: customer._id },
        { "customerDetails.email": customer.email.toLowerCase() },
      ],
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error("❌ [API /api/customers/[id]/orders GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch customer orders" },
      { status: error.status || 500 }
    );
  }
}
