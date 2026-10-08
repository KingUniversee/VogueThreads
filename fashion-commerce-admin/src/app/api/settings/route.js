import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getSystemSettings, updateSystemSettings } from "@/lib/system-service";

/**
 * GET /api/settings
 * Retrieve centralized store, GST, logistics, and payment settings.
 */
export async function GET() {
  try {
    await assertPermission(["settings.manage", "system.manage"]);

    const settings = await getSystemSettings();

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("❌ [API /api/settings GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/settings
 * Update centralized configuration with validation and audit logging.
 */
export async function PATCH(request) {
  try {
    const actor = await assertPermission(["settings.manage", "system.manage"]);
    const body = await request.json();

    const updatedSettings = await updateSystemSettings(body, actor);

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("❌ [API /api/settings PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update settings" },
      { status: error.status || 500 }
    );
  }
}
