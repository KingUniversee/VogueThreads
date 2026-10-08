import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
    }

    const cleanEmail = email?.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 });
    }

    // Validate Gmail username rules (Google requires 6-30 characters, alphanumeric and dots)
    const [localPart, domainPart] = cleanEmail.split("@");
    if (domainPart === "gmail.com" || domainPart === "googlemail.com") {
      const stripped = localPart.replace(/\./g, "");
      if (stripped.length < 6 || stripped.length > 30) {
        return NextResponse.json(
          { success: false, error: "Gmail addresses must have a valid username between 6 and 30 characters long." },
          { status: 400 }
        );
      }
      if (!/^[a-z0-9.]+$/.test(localPart)) {
        return NextResponse.json(
          { success: false, error: "Gmail address contains invalid characters. Only letters, numbers, and periods are allowed." },
          { status: 400 }
        );
      }
    }

    // Block disposable / dummy email domains
    const disposableDomains = [
      "tempmail.com",
      "mailinator.com",
      "10minutemail.com",
      "guerrillamail.com",
      "sharklasers.com",
      "throwawaymail.com",
      "example.com",
      "test.com",
    ];
    const emailDomain = cleanEmail.split("@")[1];
    if (disposableDomains.includes(emailDomain)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid, permanent email address." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if customer already exists
    const existing = await Customer.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    // Hash password with bcryptjs (cost factor 12)
    const passwordHash = await hashPassword(password);

    // Generate cryptographically secure verification token (never Math.random)
    const crypto = await import("crypto");
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawVerificationToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new customer with unverified state & hashed token
    const customer = await Customer.create({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      authProvider: "credentials",
      status: "ACTIVE",
      emailVerified: false,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: tokenExpires,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const verificationUrl = `${appUrl}/auth/verify-email?token=${rawVerificationToken}&email=${encodeURIComponent(cleanEmail)}`;

    // Dispatch verification email via central mailer
    try {
      const { sendVerificationEmail } = await import("@/lib/mailer");
      await sendVerificationEmail({
        to: cleanEmail,
        name: customer.name,
        verificationUrl,
      });
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
    }

    // Do NOT issue an authenticated session until email is verified
    return NextResponse.json(
      {
        success: true,
        needsVerification: true,
        email: cleanEmail,
        message: "Your account has been created. A verification link has been sent to your email.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [API] Registration error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}

