import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getAdminUserById, updateAdminUser, deleteAdminUser } from "@/lib/system-service";

/**
 * GET /api/admin-users/[id]
 */
export async function GET(request, { params }) {
  try {
    await assertPermission(["users.manage", "system.manage"]);
    const { id } = await params;

    const user = await getAdminUserById(id);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ [API /api/admin-users/[id] GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch admin user" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/admin-users/[id]
 */
export async function PATCH(request, { params }) {
  try {
    const actor = await assertPermission(["users.manage", "system.manage"]);
    const { id } = await params;
    const body = await request.json();

    const updatedUser = await updateAdminUser(id, body, actor);

    return NextResponse.json({
      success: true,
      message: "Admin user updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("❌ [API /api/admin-users/[id] PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update admin user", code: error.code },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/admin-users/[id]
 */
export async function DELETE(request, { params }) {
  try {
    const actor = await assertPermission(["users.manage", "system.manage"]);
    const { id } = await params;

    await deleteAdminUser(id, actor);

    return NextResponse.json({
      success: true,
      message: "Admin user deleted successfully",
    });
  } catch (error) {
    console.error("❌ [API /api/admin-users/[id] DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete admin user", code: error.code },
      { status: error.status || 500 }
    );
  }
}
