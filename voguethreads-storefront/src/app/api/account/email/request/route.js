import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { getSession, comparePassword } from "@/lib/auth";
import { sendEmailChangeVerificationEmail } from "@/lib/mailer";

export async function POST(req) {
  try {
    const session = await getSession(req);
    const userId = session?.userId;
    if (!userId && !session?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { newEmail, password } = body;

    if (!newEmail || typeof newEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid new email address is required" },
        { status: 400 }
      );
    }

    const cleanNewEmail = newEmail.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanNewEmail)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let customer = null;
    if (userId) {
      customer = await Customer.findById(userId);
    }
    if (!customer && session?.email) {
      customer = await Customer.findOne({ email: session.email.toLowerCase().trim() });
    }

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    if (customer.email === cleanNewEmail) {
      return NextResponse.json(
        { success: false, error: "The new email address is identical to your current email" },
        { status: 400 }
      );
    }

    // If customer has a password configured, verify it for safety
    if (customer.passwordHash || customer.password) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: "Current password is required to change your email" },
          { status: 400 }
        );
      }
      const isPasswordValid = await comparePassword(
        password,
        customer.passwordHash || customer.password
      );
      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: "Incorrect current password" },
          { status: 400 }
        );
      }
    }

    // Check if new email is already claimed
    const existing = await Customer.findOne({
      email: cleanNewEmail,
      _id: { $ne: customer._id },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    // Generate cryptographic token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    customer.pendingEmail = cleanNewEmail;
    customer.pendingEmailTokenHash = tokenHash;
    customer.pendingEmailExpires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await customer.save();

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001";
    const verificationUrl = `${baseUrl}/api/account/email/verify?token=${rawToken}&email=${encodeURIComponent(
      cleanNewEmail
    )}`;

    try {
      await sendEmailChangeVerificationEmail({
        to: cleanNewEmail,
        name: customer.name,
        verificationUrl,
      });
    } catch (mailErr) {
      console.error("❌ Failed to send email change verification:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `A confirmation link has been sent to ${cleanNewEmail}. Please check your inbox to confirm the change.`,
    });
  } catch (error) {
    console.error("❌ [API /api/account/email/request] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process email change request" },
      { status: 500 }
    );
  }
}
