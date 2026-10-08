import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getSalesAnalytics } from "@/lib/analytics-service";

/**
 * GET /api/analytics/sales
 * Financial sales reports, gross vs net sales, refunds, and payment channels.
 */
export async function GET(request) {
  try {
    await assertPermission(["analytics.sales", "analytics.read"]);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const data = await getSalesAnalytics({ range, startDate, endDate });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ [API /api/analytics/sales GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sales analytics" },
      { status: error.status || 500 }
    );
  }
}
