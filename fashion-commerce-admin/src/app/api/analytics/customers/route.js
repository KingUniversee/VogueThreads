import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getCustomerAnalytics } from "@/lib/analytics-service";

/**
 * GET /api/analytics/customers
 * Customer acquisition, returning buyers, order frequency, and spend tiers.
 */
export async function GET(request) {
  try {
    await assertPermission(["analytics.customers", "analytics.read"]);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const data = await getCustomerAnalytics({ range, startDate, endDate });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ [API /api/analytics/customers GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch customer analytics" },
      { status: error.status || 500 }
    );
  }
}
