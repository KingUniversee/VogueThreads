import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getConversionAnalytics } from "@/lib/analytics-service";

/**
 * GET /api/analytics/conversion
 * Authentic commerce conversion rates and transparent storefront telemetry status.
 */
export async function GET(request) {
  try {
    await assertPermission(["analytics.conversion", "analytics.read"]);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const data = await getConversionAnalytics({ range, startDate, endDate });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ [API /api/analytics/conversion GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch conversion analytics" },
      { status: error.status || 500 }
    );
  }
}
