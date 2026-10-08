import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getProductAnalytics } from "@/lib/analytics-service";

/**
 * GET /api/analytics/products
 * Line-item level product velocity, units sold, revenue, and stockout alerts.
 */
export async function GET(request) {
  try {
    await assertPermission(["analytics.products", "analytics.read"]);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const sortBy = searchParams.get("sortBy") || "revenue";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const search = searchParams.get("search") || "";

    const data = await getProductAnalytics({ range, sortBy, sortOrder, search });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("❌ [API /api/analytics/products GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch product analytics" },
      { status: error.status || 500 }
    );
  }
}
