import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import Order from "@/models/Order";

export async function POST(req) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay key secret not configured on server" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderNumber,
      orderId,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing required payment verification parameters" },
        { status: 400 }
      );
    }

    // Verify HMAC SHA-256 signature
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Payment verification signature mismatch. Possible tampering detected.",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // If order reference provided, mark as PAID
    let order = null;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order && orderNumber) {
      order = await Order.findOne({ orderNumber: orderNumber.trim().toUpperCase() });
    }

    if (order) {
      order.payment = {
        ...order.payment,
        status: "PAID",
        method: "ONLINE",
        transactionId: razorpay_payment_id,
        paidAt: new Date(),
      };

      order.timeline.push({
        event: "PAYMENT_SUCCESS",
        title: "Online Payment Captured",
        description: `Payment captured via Razorpay. Txn: ${razorpay_payment_id}`,
        timestamp: new Date(),
      });

      await order.save();
    }

    return NextResponse.json({
      success: true,
      verified: true,
      transactionId: razorpay_payment_id,
      message: "Payment signature successfully verified",
    });
  } catch (error) {
    console.error("❌ [API /api/payment/razorpay/verify] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
