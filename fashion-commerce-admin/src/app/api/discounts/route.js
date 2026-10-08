import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getDiscountsList, getDiscountMetrics, createDiscount } from "@/lib/discount-service";

/**
 * GET /api/discounts
 * List automatic discounts with search, status, type filters, and KPI metrics.
 */
export async function GET(request) {
  try {
    await assertPermission(["discounts.read", "marketing.manage"]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const discountType = searchParams.get("discountType") || "ALL";
    const sortBy = searchParams.get("sortBy") || "priority";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const [listResult, metrics] = await Promise.all([
      getDiscountsList({
        search,
        status,
        discountType,
        sortBy,
        sortOrder,
        page,
        limit,
      }),
      getDiscountMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      discounts: listResult.discounts,
      total: listResult.total,
      page: listResult.page,
      totalPages: listResult.totalPages,
      metrics,
    });
  } catch (error) {
    console.error("❌ [API /api/discounts GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch discounts" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/discounts
 * Create a new automatic discount.
 */
export async function POST(request) {
  try {
    const user = await assertPermission(["discounts.create", "marketing.manage"]);
    const body = await request.json();

    const discount = await createDiscount(body, user);

    return NextResponse.json(
      {
        success: true,
        discount,
        message: `Promotion '${discount.name}' created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [API /api/discounts POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create discount" },
      { status: error.status || 500 }
    );
  }
}
