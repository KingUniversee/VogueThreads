import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getSecurityOverview, changeAdminPassword } from "@/lib/system-service";

/**
 * GET /api/security
 * Returns security posture metrics, session status, and recent security events.
 */
export async function GET() {
  try {
    const user = await assertPermission(["security.manage", "system.manage"]);

    const data = await getSecurityOverview(user);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("❌ [API /api/security GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch security information" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/security
 * Execute security action (CHANGE_PASSWORD, REVOKE_SESSIONS).
 */
export async function POST(request) {
  try {
    const user = await assertPermission(["security.manage", "system.manage"]);
    const body = await request.json();
    const { action } = body;

    if (action === "CHANGE_PASSWORD") {
      const { currentPassword, newPassword } = body;
      await changeAdminPassword(user.id, currentPassword, newPassword, user);

      return NextResponse.json({
        success: true,
        message: "Password updated successfully. Please use your new credentials for future logins.",
      });
    }

    if (action === "REVOKE_SESSIONS") {
      // Invalidate current cookie / instruct client
      const response = NextResponse.json({
        success: true,
        message: "Active administrative session has been revoked.",
      });
      response.cookies.delete("admin_session");
      return response;
    }

    return NextResponse.json(
      { success: false, error: "Invalid security action requested." },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ [API /api/security POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Security action failed" },
      { status: error.status || 500 }
    );
  }
}
