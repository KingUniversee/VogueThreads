import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = process.env.NEXTAUTH_SECRET || "fashion_admin_enterprise_secret_session_development_key_12345";
const ENCODED_SECRET = new TextEncoder().encode(SECRET_KEY);
export const SESSION_COOKIE_NAME = "admin_session";
const SESSION_DURATION_DEFAULT = "24h";
const SESSION_DURATION_REMEMBER = "30d";

/**
 * Sign a secure JWT session token containing sanitized user claims.
 * NEVER embed password or sensitive secrets in the token.
 */
export async function createSessionToken(payload, rememberMe = false) {
  const cleanPayload = {
    id: String(payload.id),
    email: String(payload.email),
    name: String(payload.name),
    role: String(payload.role || "super-admin"),
    roleName: String(payload.roleName || "Super Admin"),
    permissions: Array.isArray(payload.permissions) ? payload.permissions.map(String) : [],
  };

  const duration = rememberMe ? SESSION_DURATION_REMEMBER : SESSION_DURATION_DEFAULT;

  return await new SignJWT(cleanPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(duration)
    .sign(ENCODED_SECRET);
}

/**
 * Verify a JWT session token. Returns the decoded payload or null if invalid/expired.
 */
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, ENCODED_SECRET);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Server-side helper to read the active session from HTTP cookies.
 * Safe to call in Server Components, Server Actions, and API Route Handlers.
 */
export async function getSessionUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    return await verifySessionToken(token);
  } catch (err) {
    return null;
  }
}

/**
 * Server-side permission assertion guard.
 * Checks if the current user possesses the required permission code or has super-admin role.
 */
export async function assertPermission(permissionCode) {
  const user = await getSessionUser();
  if (!user) {
    const err = new Error("Authentication required");
    err.status = 401;
    throw err;
  }

  // Super Admin bypasses all specific permission checks
  if (user.role === "super-admin" || (user.permissions && user.permissions.includes("*"))) {
    return user;
  }

  const userPerms = user.permissions || [];
  const allowedCodes = Array.isArray(permissionCode) ? permissionCode : [permissionCode];
  const hasMarketingManage = userPerms.includes("marketing.manage");
  const hasAnalyticsRead = userPerms.includes("analytics.read");
  const hasSystemManage = userPerms.includes("system.manage");
  const hasCatalogManage = userPerms.includes("catalog.manage");
  const hasCatalogRead = userPerms.includes("catalog.read");
  const hasInventoryManage = userPerms.includes("inventory.manage");
  const hasOrdersManage = userPerms.includes("orders.manage");
  const hasCustomersManage = userPerms.includes("customers.manage");

  const hasPermission = allowedCodes.some((code) => {
    if (userPerms.includes(code)) return true;
    if (hasMarketingManage && (code.startsWith("coupons.") || code.startsWith("discounts."))) {
      return true;
    }
    if (hasAnalyticsRead && code.startsWith("analytics.")) {
      return true;
    }
    if (hasSystemManage && (code.startsWith("users.") || code.startsWith("roles.") || code.startsWith("audit.") || code.startsWith("settings.") || code.startsWith("security."))) {
      return true;
    }
    if (hasCatalogManage && (code.startsWith("products.") || code.startsWith("categories.") || code.startsWith("collections.") || code.startsWith("brands.") || code.startsWith("attributes."))) {
      return true;
    }
    if (hasCatalogRead && code.endsWith(".read") && (code.startsWith("products.") || code.startsWith("categories.") || code.startsWith("collections.") || code.startsWith("brands.") || code.startsWith("attributes."))) {
      return true;
    }
    if (hasInventoryManage && (code.startsWith("inventory.") || code.startsWith("stock."))) {
      return true;
    }
    if (hasOrdersManage && code.startsWith("orders.")) {
      return true;
    }
    if (hasCustomersManage && (code.startsWith("customers.") || code.startsWith("segments.") || code.startsWith("reviews."))) {
      return true;
    }
    return false;
  });

  if (!hasPermission) {
    const err = new Error(
      `Forbidden: Missing permission '${Array.isArray(permissionCode) ? permissionCode.join(" or ") : permissionCode}'`
    );
    err.status = 403;
    throw err;
  }

  return user;
}
