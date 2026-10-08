import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongoose";
import User from "@/models/User";
import Role from "@/models/Role";
import AuditLog from "@/models/AuditLog";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const validation = LoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0]?.message || "Invalid input data",
        },
        { status: 400 }
      );
    }

    const { email, password, rememberMe } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    await connectToDatabase();

    // Find user by normalized email and populate role
    const user = await User.findOne({ email: normalizedEmail }).populate("roleId");

    if (!user) {
      // Use uniform timing and message to prevent user enumeration
      await bcrypt.compare("dummy_password", "$2a$12$e8984920492840928409284092840928409284092840928409284");
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check account active state
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "This admin account has been deactivated. Please contact your system administrator." },
        { status: 403 }
      );
    }

    // Check brute force lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesRemaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / (1000 * 60));
      return NextResponse.json(
        {
          success: false,
          error: `Account locked due to excessive failed attempts. Please retry in ${minutesRemaining} minute(s).`,
        },
        { status: 429 }
      );
    }

    // Verify hashed password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lockout
      }
      await user.save();

      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Successful login - reset failed attempts & update timestamps
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    await user.save();

    const roleDoc = user.roleId
      ? (typeof user.roleId.toObject === "function" ? user.roleId.toObject() : user.roleId)
      : {};

    const rawPermissions = roleDoc.permissions || [];
    const permissions = Array.from(rawPermissions).map(String);

    // Sign session token with sanitized claims
    const sessionPayload = {
      id: user._id.toString(),
      email: String(user.email),
      name: String(user.name),
      role: String(roleDoc.slug || "super-admin"),
      roleName: String(roleDoc.name || "Super Admin"),
      permissions: permissions,
    };

    const token = await createSessionToken(sessionPayload, Boolean(rememberMe));

    // Record audit log entry
    try {
      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        action: "USER_LOGIN_SUCCESS",
        resource: "User",
        resourceId: user._id.toString(),
        details: { method: "credentials", rememberMe: Boolean(rememberMe) },
        ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
        userAgent: request.headers.get("user-agent") || "unknown",
      });
    } catch (auditErr) {
      console.warn("⚠️ [AuditLog] Non-critical error recording login event:", auditErr.message);
    }

    // Construct response with secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: sessionPayload.role,
        roleName: sessionPayload.roleName,
      },
    });

    const isProduction = process.env.NODE_ENV === "production";

    const cookieOptions = {
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
    };

    if (rememberMe) {
      // 30 days persistent cookie
      const PERSISTENT_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
      cookieOptions.maxAge = PERSISTENT_MAX_AGE;
      cookieOptions.expires = new Date(Date.now() + PERSISTENT_MAX_AGE * 1000);
    }
    // When rememberMe is false, omitting maxAge/expires creates a true browser session cookie

    response.cookies.set(cookieOptions);

    return response;
  } catch (error) {
    console.error("❌ [Auth] Error in login handler:", error.message);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
