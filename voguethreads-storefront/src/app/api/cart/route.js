import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Cart from "@/models/Cart";
import { getSession } from "@/lib/auth";

export async function GET(req) {
  try {
    const session = await getSession(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        items: [],
      });
    }

    await connectToDatabase();
    const cart = await Cart.findOne({ customerId: userId }).lean();

    return NextResponse.json({
      success: true,
      authenticated: true,
      items: cart?.items || [],
    });
  } catch (error) {
    console.error("❌ [API /api/cart GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve cart" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const session = await getSession(req);
    const userId = session?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to sync cart." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { items = [] } = body;

    await connectToDatabase();

    const cart = await Cart.findOneAndUpdate(
      { customerId: userId },
      { $set: { items } },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      success: true,
      items: cart.items,
    });
  } catch (error) {
    console.error("❌ [API /api/cart PUT] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update cart" },
      { status: 500 }
    );
  }
}
