import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Cart from "@/models/Cart";
import { getSession } from "@/lib/auth";

export async function POST(req) {
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
    const { guestItems = [] } = body;

    await connectToDatabase();

    let cart = await Cart.findOne({ customerId: userId });
    if (!cart) {
      cart = new Cart({ customerId: userId, items: [] });
    }

    // Merge strategy: map existing by SKU
    const itemMap = new Map();
    for (const item of cart.items) {
      itemMap.set(item.sku, item.toObject ? item.toObject() : item);
    }

    for (const guestItem of guestItems) {
      if (!guestItem || !guestItem.sku) continue;
      if (itemMap.has(guestItem.sku)) {
        const existing = itemMap.get(guestItem.sku);
        existing.quantity = Math.max(
          1,
          Number(existing.quantity || 1) + Number(guestItem.quantity || 1)
        );
      } else {
        itemMap.set(guestItem.sku, {
          productId: guestItem.productId,
          variantId: guestItem.variantId,
          sku: guestItem.sku,
          title: guestItem.title || "Product",
          price: Number(guestItem.price || 0),
          quantity: Number(guestItem.quantity || 1),
          color: guestItem.color || "",
          size: guestItem.size || "",
          imageUrl: guestItem.imageUrl || "",
        });
      }
    }

    cart.items = Array.from(itemMap.values());
    await cart.save();

    return NextResponse.json({
      success: true,
      items: cart.items,
    });
  } catch (error) {
    console.error("❌ [API /api/cart/sync POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sync cart" },
      { status: 500 }
    );
  }
}
