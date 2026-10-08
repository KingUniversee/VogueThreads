import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getAnalyticsOverview } from "@/lib/analytics-service";

/**
 * GET /api/analytics/overview
 * Executive commerce overview KPIs, comparative deltas, and timeline chart data.
 */
export async function GET(request) {
  try {
    await assertPermission(["analytics.overview", "analytics.read"]);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const data = await getAnalyticsOverview({ range, startDate, endDate });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ [API /api/analytics/overview GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch analytics overview" },
      { status: error.status || 500 }
    );
  }
}
