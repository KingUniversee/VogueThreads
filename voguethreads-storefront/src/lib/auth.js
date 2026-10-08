import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

/**
 * Retrieve and validate the JWT session secret strictly from environment variables.
 * Fails securely if missing or less than 32 characters (256 bits).
 * Never generates a runtime random or static fallback secret.
 */
export function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "FATAL SERVER CONFIGURATION ERROR: 'JWT_SECRET' (or 'AUTH_SECRET') environment variable is missing. " +
      "Session signing and verification cannot proceed without a configured production secret."
    );
  }

  if (typeof secret !== "string" || secret.trim().length < 32) {
    throw new Error(
      "FATAL SERVER CONFIGURATION ERROR: 'JWT_SECRET' must be a strong secret with a minimum length of 32 characters."
    );
  }

  return new TextEncoder().encode(secret.trim());
}

export const COOKIE_NAME = "vt_session";
const TOKEN_EXPIRY = "30d";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a valid string");
  }
  return await bcrypt.hash(password, 12);
}

/**
 * Compare a submitted password against a bcrypt hash
 */
export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Create a signed JWT session token using jose
 */
export async function createSessionToken(payload) {
  const secretKey = getJwtSecretKey();
  const userId = (payload.userId || payload.id || (payload._id ? payload._id.toString() : ""))?.toString()?.trim();

  if (!userId) {
    throw new Error(
      "Cannot create session token: 'userId' is required as the primary authorization identity."
    );
  }

  return await new SignJWT({
    userId,
    email: payload.email?.toLowerCase()?.trim() || "",
    name: payload.name || "",
    avatar: payload.avatar || "",
    provider: payload.provider || payload.authProvider || "credentials",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secretKey);
}

/**
 * Verify a JWT session token using jose
 */
export async function verifySessionToken(token) {
  try {
    if (!token) return null;
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (err) {
    if (err.message?.includes("FATAL SERVER CONFIGURATION ERROR")) {
      console.error(err.message);
    }
    return null;
  }
}

/**
 * Extract and verify session from request headers or Next.js cookies
 */
export async function getSession(req) {
  try {
    let token = null;

    if (req?.cookies?.get) {
      token = req.cookies.get(COOKIE_NAME)?.value;
    } else if (req?.headers?.get) {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
      if (match) token = match[1];
    }

    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Attach the session cookie to a NextResponse
 */
export function setSessionCookie(response, token) {
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

/**
 * Clear the session cookie from a NextResponse
 */
export function clearSessionCookie(response) {
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
