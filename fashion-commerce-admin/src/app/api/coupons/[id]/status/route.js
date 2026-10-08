import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { toggleCouponStatus } from "@/lib/coupon-service";

/**
 * PATCH /api/coupons/[id]/status
 * Quick toggle coupon status (ACTIVE, INACTIVE, ARCHIVED).
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission(["coupons.update", "marketing.manage"]);
    const { id } = await params;
    const body = await request.json();

    const { status } = body;
    if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid coupon status" },
        { status: 400 }
      );
    }

    const updated = await toggleCouponStatus(id, status, user);

    return NextResponse.json({
      success: true,
      coupon: updated,
      message: `Coupon status updated to ${status}`,
    });
  } catch (error) {
    console.error("❌ [API /api/coupons/[id]/status PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update status" },
      { status: error.status || 500 }
    );
  }
}
