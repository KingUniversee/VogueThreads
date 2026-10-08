import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { updateRole, deleteRole } from "@/lib/system-service";

/**
 * PATCH /api/roles/[id]
 */
export async function PATCH(request, { params }) {
  try {
    const actor = await assertPermission(["roles.manage", "system.manage"]);
    const { id } = await params;
    const body = await request.json();

    const role = await updateRole(id, body, actor);

    return NextResponse.json({
      success: true,
      message: "Role updated successfully",
      role,
    });
  } catch (error) {
    console.error("❌ [API /api/roles/[id] PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update role" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/roles/[id]
 */
export async function DELETE(request, { params }) {
  try {
    const actor = await assertPermission(["roles.manage", "system.manage"]);
    const { id } = await params;

    await deleteRole(id, actor);

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("❌ [API /api/roles/[id] DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete role" },
      { status: error.status || 500 }
    );
  }
}
