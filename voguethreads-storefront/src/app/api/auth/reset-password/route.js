import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { hashPassword } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { token, email, password } = body;

    if (!token || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Token, email, and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    await connectToDatabase();

    const customer = await Customer.findOne({ email: cleanEmail });
    if (!customer || !customer.passwordResetTokenHash) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired password reset request" },
        { status: 400 }
      );
    }

    // Check expiration
    if (customer.passwordResetExpires && customer.passwordResetExpires < new Date()) {
      return NextResponse.json(
        { success: false, error: "Password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Verify token hash
    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
    if (customer.passwordResetTokenHash !== tokenHash) {
      return NextResponse.json(
        { success: false, error: "Invalid password reset token" },
        { status: 400 }
      );
    }

    // Hash new password using bcryptjs with cost factor 12
    const newPasswordHash = await hashPassword(password);

    customer.passwordHash = newPasswordHash;
    customer.password = undefined; // purge legacy plaintext if present
    customer.passwordResetTokenHash = undefined;
    customer.passwordResetExpires = undefined;
    // When password is reset via verified email link, set emailVerified to true
    customer.emailVerified = true;
    await customer.save();

    return NextResponse.json({
      success: true,
      message: "Password reset successful! You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
