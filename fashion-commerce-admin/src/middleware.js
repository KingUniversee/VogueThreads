import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.NEXTAUTH_SECRET || "fashion_admin_enterprise_secret_session_development_key_12345";
const ENCODED_SECRET = new TextEncoder().encode(SECRET_KEY);
const SESSION_COOKIE_NAME = "admin_session";

async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, ENCODED_SECRET);
    return payload;
  } catch (err) {
    return null;
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Alias /admin to /
  if (pathname === "/admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  const isAuthenticated = Boolean(session);

  // If already authenticated and visiting /admin/login, redirect to /
  if (pathname === "/admin/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // All other pages in the admin application require authentication
  if (!isAuthenticated) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
