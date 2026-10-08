import { NextResponse } from "next/server";
import { validateAndCalculateCoupon } from "@/lib/promotion-engine";

/**
 * POST /api/coupons/validate
 * Authoritatively validates a coupon code against cart items and customer profile.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      code,
      cartItems = [],
      customerId = null,
      customerEmail = null,
      orderSubtotal = null,
    } = body;

    const result = await validateAndCalculateCoupon({
      code,
      cartItems,
      customerId,
      customerEmail,
      orderSubtotal,
    });

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          valid: false,
          error: result.reason || "Coupon is invalid or not applicable",
          reason: result.reason,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      discountAmount: result.discountAmount,
      coupon: {
        _id: result.coupon._id,
        code: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
        description: result.coupon.description,
      },
      eligibleSubtotal: result.eligibleSubtotal,
      cartSubtotal: result.cartSubtotal,
      promotionSnapshot: result.promotionSnapshot,
      message: `Coupon '${result.coupon.code}' applied successfully!`,
    });
  } catch (error) {
    console.error("❌ [API /api/coupons/validate POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
