import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { toggleAdminUserStatus } from "@/lib/system-service";

/**
 * PATCH /api/admin-users/[id]/status
 * Toggle isActive state or unlock account.
 */
export async function PATCH(request, { params }) {
  try {
    const actor = await assertPermission(["users.manage", "system.manage"]);
    const { id } = await params;
    const body = await request.json();

    const { isActive, reason } = body;

    const result = await toggleAdminUserStatus(id, isActive, reason, actor);

    return NextResponse.json({
      success: true,
      message: isActive ? "Account activated successfully" : "Account deactivated successfully",
      ...result,
    });
  } catch (error) {
    console.error("❌ [API /api/admin-users/[id]/status PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to toggle user status", code: error.code },
      { status: error.status || 500 }
    );
  }
}
