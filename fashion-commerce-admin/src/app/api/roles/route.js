import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getRolesWithCounts, createRole } from "@/lib/system-service";

/**
 * GET /api/roles
 * List enterprise roles with live user counts, permission counts, and grouped permissions.
 */
export async function GET() {
  try {
    await assertPermission(["roles.manage", "system.manage"]);

    const data = await getRolesWithCounts();

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("❌ [API /api/roles GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch roles" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/roles
 * Create custom administrative role.
 */
export async function POST(request) {
  try {
    const actor = await assertPermission(["roles.manage", "system.manage"]);

    const body = await request.json();
    const newRole = await createRole(body, actor);

    return NextResponse.json(
      {
        success: true,
        message: "Role created successfully",
        role: newRole,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [API /api/roles POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create role" },
      { status: error.status || 500 }
    );
  }
}
