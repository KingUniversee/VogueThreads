import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const customer = await Customer.findOne({ email: cleanEmail });

    if (!customer) {
      // Do not disclose account presence, return generic response
      return NextResponse.json({
        success: true,
        message: "If an unverified account exists with this email, a new verification link has been sent.",
      });
    }

    if (customer.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "This account is already verified. Please sign in.",
      });
    }

    // Rate limiting: prevent email flooding if requested less than 60s ago
    if (customer.emailVerificationExpires) {
      const msRemaining = customer.emailVerificationExpires.getTime() - Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      // If expires is more than 23h 59m in the future, it was sent less than 60 seconds ago
      if (msRemaining > twentyFourHours - 60 * 1000) {
        return NextResponse.json(
          {
            success: false,
            error: "Please wait at least 60 seconds before requesting another verification email.",
          },
          { status: 429 }
        );
      }
    }

    // Generate new secure token and invalidate old one
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    customer.emailVerificationTokenHash = tokenHash;
    customer.emailVerificationExpires = tokenExpires;
    await customer.save();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const verificationUrl = `${appUrl}/auth/verify-email?token=${rawVerificationToken}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      await sendVerificationEmail({
        to: cleanEmail,
        name: customer.name,
        verificationUrl,
      });
    } catch (err) {
      console.error("Failed to resend verification email:", err);
    }

    return NextResponse.json({
      success: true,
      message: "A new verification link has been sent to your email.",
    });
  } catch (error) {
    console.error("POST /api/auth/verify-email/resend error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resend verification link" },
      { status: 500 }
    );
  }
}
