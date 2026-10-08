import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import "@/models/index.js";
import Coupon from "@/models/Coupon";
import { updateCoupon, deleteCoupon } from "@/lib/coupon-service";

/**
 * GET /api/coupons/[id]
 * Fetch coupon details by ID.
 */
export async function GET(request, { params }) {
  try {
    await assertPermission(["coupons.read", "marketing.manage"]);
    await connectToDatabase();

    const { id } = await params;
    const coupon = await Coupon.findById(id)
      .populate("applicableProducts", "title slug thumbnail")
      .populate("applicableCategories", "name slug")
      .populate("applicableCollections", "name slug")
      .populate("applicableCustomerSegments", "name slug type")
      .lean();

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: "Coupon not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error("❌ [API /api/coupons/[id] GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch coupon" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/coupons/[id]
 * Update an existing coupon.
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission(["coupons.update", "marketing.manage"]);
    const { id } = await params;
    const body = await request.json();

    const updated = await updateCoupon(id, body, user);

    return NextResponse.json({
      success: true,
      coupon: updated,
      message: `Coupon '${updated.code}' updated successfully`,
    });
  } catch (error) {
    console.error("❌ [API /api/coupons/[id] PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update coupon" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/coupons/[id]
 * Delete coupon permanently if safe, or reject with archive instruction.
 */
export async function DELETE(request, { params }) {
  try {
    const user = await assertPermission(["coupons.archive", "marketing.manage"]);
    const { id } = await params;

    const result = await deleteCoupon(id, user);

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ [API /api/coupons/[id] DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete coupon" },
      { status: error.status || 500 }
    );
  }
}
