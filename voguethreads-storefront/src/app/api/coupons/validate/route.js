import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import { getSession } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { code, subtotal = 0 } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid coupon code" },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();
    await connectToDatabase();

    const coupon = await Coupon.findOne({
      $or: [{ normalizedCode: cleanCode }, { code: cleanCode }],
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon code not recognized" },
        { status: 404 }
      );
    }

    if (coupon.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "This coupon is no longer active" },
        { status: 400 }
      );
    }

    const now = new Date();
    if (coupon.startAt && now < new Date(coupon.startAt)) {
      return NextResponse.json(
        { success: false, error: "This promotion has not started yet" },
        { status: 400 }
      );
    }

    if (coupon.endAt && now > new Date(coupon.endAt)) {
      return NextResponse.json(
        { success: false, error: "This coupon has expired" },
        { status: 400 }
      );
    }

    const numSubtotal = Math.max(0, Number(subtotal) || 0);
    if (coupon.minimumOrderValue && numSubtotal < coupon.minimumOrderValue) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum order value of ₹${coupon.minimumOrderValue.toLocaleString("en-IN")} required for this coupon`,
        },
        { status: 400 }
      );
    }

    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json(
        { success: false, error: "This coupon has reached its total redemption limit" },
        { status: 400 }
      );
    }

    // Per-customer usage limit check
    const session = await getSession(req);
    if (session?.userId && coupon.perCustomerUsageLimit) {
      const customerOrdersCount = await Order.countDocuments({
        customerId: session.userId,
        "pricing.couponCode": cleanCode,
        status: { $ne: "CANCELLED" },
      });

      if (customerOrdersCount >= coupon.perCustomerUsageLimit) {
        return NextResponse.json(
          {
            success: false,
            error: `You have already redeemed coupon ${cleanCode} the maximum allowed times`,
          },
          { status: 400 }
        );
      }
    }

    // Calculate discount amount server-side
    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (numSubtotal * coupon.discountValue) / 100;
      if (coupon.maximumDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maximumDiscountAmount);
      }
    } else {
      // FIXED
      discountAmount = Math.min(coupon.discountValue, numSubtotal);
    }

    discountAmount = Math.max(0, Number(discountAmount.toFixed(2)));

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        maximumDiscountAmount: coupon.maximumDiscountAmount,
      },
      message: `Coupon ${coupon.code} applied: -₹${discountAmount.toLocaleString("en-IN")}`,
    });
  } catch (error) {
    console.error("POST /api/coupons/validate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
