import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "A valid email address is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const customer = await Customer.findOne({ email: cleanEmail });

    // Consistent response to prevent account enumeration
    const genericResponse = {
      success: true,
      message: "If an account exists with this email address, password reset instructions have been sent.",
    };

    if (!customer) {
      return NextResponse.json(genericResponse);
    }

    // Google-only accounts do not use password reset
    if (customer.authProvider === "google" && !customer.passwordHash) {
      return NextResponse.json(genericResponse);
    }

    // Rate limiting: prevent spamming resets within 60 seconds
    if (customer.passwordResetExpires) {
      const msRemaining = customer.passwordResetExpires.getTime() - Date.now();
      const oneHour = 60 * 60 * 1000;
      if (msRemaining > oneHour - 60 * 1000) {
        return NextResponse.json(
          {
            success: false,
            error: "Please wait at least 60 seconds before requesting another password reset.",
          },
          { status: 429 }
        );
      }
    }

    // Generate secure random token
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    customer.passwordResetTokenHash = tokenHash;
    customer.passwordResetExpires = tokenExpires;
    await customer.save();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const resetUrl = `${appUrl}/auth/reset-password?token=${rawResetToken}&email=${encodeURIComponent(cleanEmail)}`;

    try {
      await sendPasswordResetEmail({
        to: cleanEmail,
        name: customer.name,
        resetUrl,
      });
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr);
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
