import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Customer from "@/models/Customer";
import { comparePassword, hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ success: false, error: "Valid email is required" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }

    await connectToDatabase();

    const customer = await Customer.findOne({ email: cleanEmail });

    // Uniform error message to prevent account enumeration
    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check account status
    if (customer.status === "BLOCKED") {
      return NextResponse.json(
        { success: false, error: "This account has been suspended. Please contact client support." },
        { status: 403 }
      );
    }

    // Check if account has no credentials (e.g. registered via Google)
    if (!customer.passwordHash && !customer.password) {
      return NextResponse.json(
        { success: false, error: "This account is linked with Google. Please use 'Sign In with Google'." },
        { status: 401 }
      );
    }

    let isPasswordValid = false;

    if (customer.passwordHash) {
      // Modern bcrypt hash comparison
      isPasswordValid = await comparePassword(password, customer.passwordHash);
    } else if (customer.password) {
      // Legacy plaintext backwards compatibility & automatic upgrade
      if (customer.password === password) {
        isPasswordValid = true;
        try {
          const newHash = await hashPassword(password);
          customer.passwordHash = newHash;
          customer.password = undefined; // purge plaintext
          await customer.save();
        } catch (upgradeErr) {
          console.warn("Could not upgrade legacy password hash:", upgradeErr);
        }
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Require email verification for local credentials accounts
    if (customer.authProvider !== "google" && customer.emailVerified === false) {
      return NextResponse.json(
        {
          success: false,
          error: "Please verify your email address before logging in. Check your inbox for the activation link.",
          needsVerification: true,
          email: customer.email,
        },
        { status: 403 }
      );
    }

    const userPayload = {
      userId: customer._id.toString(),
      name: customer.name,
      email: customer.email,
      avatar: customer.avatar || "",
      provider: customer.authProvider || "credentials",
    };

    // Generate signed JWT session token
    const token = await createSessionToken(userPayload);

    const response = NextResponse.json({
      success: true,
      user: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
        avatar: customer.avatar,
      },
    });

    // Attach secure HttpOnly session cookie
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error("❌ [API] Login error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to sign in" },
      { status: 500 }
    );
  }
}

