import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      return NextResponse.json(
        { success: false, error: "Missing token or email parameter" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    await connectToDatabase();

    const customer = await Customer.findOne({ email: cleanEmail });
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "No account found matching this email address" },
        { status: 404 }
      );
    }

    if (customer.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "Email address is already verified. Please sign in to continue.",
      });
    }

    if (!customer.emailVerificationTokenHash) {
      return NextResponse.json(
        { success: false, error: "This verification link has already been used or is invalid." },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    if (customer.emailVerificationTokenHash !== tokenHash) {
      return NextResponse.json(
        { success: false, error: "Invalid verification link. Please check your email or request a new link." },
        { status: 400 }
      );
    }

    if (customer.emailVerificationExpires && customer.emailVerificationExpires < new Date()) {
      return NextResponse.json(
        {
          success: false,
          expired: true,
          error: "Verification link has expired. Please request a new verification link.",
        },
        { status: 400 }
      );
    }

    // Mark verified and invalidate token
    customer.emailVerified = true;
    customer.emailVerificationTokenHash = undefined;
    customer.emailVerificationExpires = undefined;
    await customer.save();

    return NextResponse.json({
      success: true,
      message: "Your email has been verified successfully! You may now sign in.",
    });
  } catch (error) {
    console.error("GET /api/auth/verify-email error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify email address. Please try again." },
      { status: 500 }
    );
  }
}
