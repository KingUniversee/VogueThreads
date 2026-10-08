import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001";

    if (!token) {
      return NextResponse.redirect(
        `${baseUrl}/account?error=${encodeURIComponent("Missing verification token")}`
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await connectToDatabase();

    const query = {
      pendingEmailTokenHash: tokenHash,
      pendingEmailExpires: { $gt: new Date() },
    };
    if (email) {
      query.pendingEmail = email.toLowerCase().trim();
    }

    const customer = await Customer.findOne(query);

    if (!customer) {
      return NextResponse.redirect(
        `${baseUrl}/account?error=${encodeURIComponent(
          "Invalid or expired email change link. Please request a new one."
        )}`
      );
    }

    const targetEmail = customer.pendingEmail;

    // Ensure email is not already taken by someone else
    const conflict = await Customer.findOne({
      email: targetEmail,
      _id: { $ne: customer._id },
    });
    if (conflict) {
      return NextResponse.redirect(
        `${baseUrl}/account?error=${encodeURIComponent(
          "This email address is already claimed by another account."
        )}`
      );
    }

    // Apply email change
    customer.email = targetEmail;
    customer.emailVerified = true;
    customer.pendingEmail = undefined;
    customer.pendingEmailTokenHash = undefined;
    customer.pendingEmailExpires = undefined;
    await customer.save();

    // Re-issue authenticated session token with the updated email
    const sessionToken = await createSessionToken({
      userId: customer._id.toString(),
      email: customer.email,
      name: customer.name,
      avatar: customer.avatar,
      provider: customer.authProvider || "credentials",
    });

    const response = NextResponse.redirect(
      `${baseUrl}/account?emailChanged=true`
    );
    setSessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error("❌ [API /api/account/email/verify] Error:", error);
    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001";
    return NextResponse.redirect(
      `${baseUrl}/account?error=${encodeURIComponent(
        error.message || "Failed to verify email change"
      )}`
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { token, email } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    await connectToDatabase();

    const query = {
      pendingEmailTokenHash: tokenHash,
      pendingEmailExpires: { $gt: new Date() },
    };
    if (email) {
      query.pendingEmail = email.toLowerCase().trim();
    }

    const customer = await Customer.findOne(query);

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired email change link. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const targetEmail = customer.pendingEmail;

    const conflict = await Customer.findOne({
      email: targetEmail,
      _id: { $ne: customer._id },
    });
    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          error: "This email address is already claimed by another account.",
        },
        { status: 409 }
      );
    }

    customer.email = targetEmail;
    customer.emailVerified = true;
    customer.pendingEmail = undefined;
    customer.pendingEmailTokenHash = undefined;
    customer.pendingEmailExpires = undefined;
    await customer.save();

    const sessionToken = await createSessionToken({
      userId: customer._id.toString(),
      email: customer.email,
      name: customer.name,
      avatar: customer.avatar,
      provider: customer.authProvider || "credentials",
    });

    const response = NextResponse.json({
      success: true,
      message: "Email address successfully updated.",
      email: customer.email,
    });
    setSessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    console.error("❌ [API /api/account/email/verify POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify email change" },
      { status: 500 }
    );
  }
}
