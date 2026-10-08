import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Product from "@/models/Product";
import Coupon from "@/models/Coupon";

export async function POST(req) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error: "Online payment gateway is in configuration mode. Please select Cash on Delivery (COD).",
        },
        { status: 200 }
      );
    }

    const body = await req.json();
    const { items = [], couponCode } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Cart is empty" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Calculate authoritative subtotal
    let subtotal = 0;
    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      let authoritativePrice = null;

      if (item.productId) {
        const prod = await Product.findById(item.productId).lean();
        if (prod) {
          const variant = prod.variants?.find(
            (v) => v.sku === item.sku || v._id?.toString() === item.variantId
          );
          authoritativePrice = variant?.price ?? prod.price;
        }
      }
      if (authoritativePrice === null && item.sku) {
        const prod = await Product.findOne({ "variants.sku": item.sku }).lean();
        if (prod) {
          const variant = prod.variants?.find((v) => v.sku === item.sku);
          authoritativePrice = variant?.price ?? prod.price;
        }
      }

      const price = Number(authoritativePrice ?? item.price ?? 0);
      subtotal += price * qty;
    }

    // Calculate discount
    let discountAmount = 0;
    if (couponCode && typeof couponCode === "string") {
      const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        status: "ACTIVE",
      }).lean();

      if (coupon) {
        const now = new Date();
        const startValid = !coupon.startAt || new Date(coupon.startAt) <= now;
        const endValid = !coupon.endAt || new Date(coupon.endAt) >= now;
        const limitValid =
          coupon.usageLimit == null || (coupon.usageCount || 0) < coupon.usageLimit;
        const minOrderValid =
          coupon.minimumOrderValue == null || subtotal >= coupon.minimumOrderValue;

        if (startValid && endValid && limitValid && minOrderValid) {
          if (coupon.type === "PERCENTAGE") {
            let disc = (subtotal * coupon.value) / 100;
            if (coupon.maximumDiscountAmount) {
              disc = Math.min(disc, coupon.maximumDiscountAmount);
            }
            discountAmount = Math.round(disc);
          } else if (coupon.type === "FIXED") {
            discountAmount = Math.min(coupon.value, subtotal);
          }
        }
      }
    }

    const shippingFee = subtotal > 1500 ? 0 : 100;
    const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);
    const amountInPaise = Math.round(grandTotal * 100);

    // Call Razorpay API
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
        payment_capture: 1,
      }),
    });

    if (!razorpayRes.ok) {
      const errData = await razorpayRes.json();
      console.error("❌ Razorpay order creation failed:", errData);
      return NextResponse.json(
        {
          success: false,
          error: errData.error?.description || "Failed to initiate online payment",
        },
        { status: 500 }
      );
    }

    const orderData = await razorpayRes.json();

    return NextResponse.json({
      success: true,
      configured: true,
      keyId,
      razorpayOrderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      calculatedPricing: {
        subtotal,
        discountAmount,
        shippingFee,
        grandTotal,
      },
    });
  } catch (error) {
    console.error("❌ [API /api/payment/razorpay/order] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
