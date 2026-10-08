import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getAdminUsers, createAdminUser } from "@/lib/system-service";

/**
 * GET /api/admin-users
 * List administrative staff accounts with search, filters, and metrics.
 */
export async function GET(request) {
  try {
    await assertPermission(["users.manage", "system.manage"]);

    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search") || "";
    const roleId = searchParams.get("roleId");
    const status = searchParams.get("status") || "ALL";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const result = await getAdminUsers({
      page,
      limit,
      search,
      roleId,
      status,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("❌ [API /api/admin-users GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch admin users" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/admin-users
 * Create a new admin staff account with hashed credentials.
 */
export async function POST(request) {
  try {
    const actor = await assertPermission(["users.manage", "system.manage"]);

    const body = await request.json();
    const newUser = await createAdminUser(body, actor);

    return NextResponse.json(
      {
        success: true,
        message: "Admin staff account created successfully",
        user: newUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [API /api/admin-users POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create admin user" },
      { status: error.status || 500 }
    );
  }
}
