import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { getCouponsList, getCouponMetrics, createCoupon } from "@/lib/coupon-service";

/**
 * GET /api/coupons
 * List coupons with search, status filters, validity, pagination, and KPI metrics.
 */
export async function GET(request) {
  try {
    await assertPermission(["coupons.read", "marketing.manage"]);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const discountType = searchParams.get("discountType") || "ALL";
    const validity = searchParams.get("validity") || "ALL";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const [listResult, metrics] = await Promise.all([
      getCouponsList({
        search,
        status,
        discountType,
        validity,
        sortBy,
        sortOrder,
        page,
        limit,
      }),
      getCouponMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      coupons: listResult.coupons,
      total: listResult.total,
      page: listResult.page,
      totalPages: listResult.totalPages,
      metrics,
    });
  } catch (error) {
    console.error("❌ [API /api/coupons GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch coupons" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/coupons
 * Create a new coupon promo code.
 */
export async function POST(request) {
  try {
    const user = await assertPermission(["coupons.create", "marketing.manage"]);
    const body = await request.json();

    const coupon = await createCoupon(body, user);

    return NextResponse.json(
      {
        success: true,
        coupon,
        message: `Coupon '${coupon.code}' created successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [API /api/coupons POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create coupon" },
      { status: error.status || 500 }
    );
  }
}
