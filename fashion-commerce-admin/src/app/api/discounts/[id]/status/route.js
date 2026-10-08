import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { toggleDiscountStatus } from "@/lib/discount-service";

/**
 * PATCH /api/discounts/[id]/status
 * Quick toggle discount status (ACTIVE, INACTIVE, ARCHIVED).
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission(["discounts.update", "marketing.manage"]);
    const { id } = await params;
    const body = await request.json();

    const { status } = body;
    if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid discount status" },
        { status: 400 }
      );
    }

    const updated = await toggleDiscountStatus(id, status, user);

    return NextResponse.json({
      success: true,
      discount: updated,
      message: `Promotion status updated to ${status}`,
    });
  } catch (error) {
    console.error("❌ [API /api/discounts/[id]/status PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update status" },
      { status: error.status || 500 }
    );
  }
}
