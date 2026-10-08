import { NextResponse } from "next/server";
import { assertPermission } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import "@/models/index.js";
import Discount from "@/models/Discount";
import { updateDiscount, deleteDiscount } from "@/lib/discount-service";

/**
 * GET /api/discounts/[id]
 * Fetch discount details by ID.
 */
export async function GET(request, { params }) {
  try {
    await assertPermission(["discounts.read", "marketing.manage"]);
    await connectToDatabase();

    const { id } = await params;
    const discount = await Discount.findById(id)
      .populate("applicableProducts", "title slug thumbnail")
      .populate("applicableCategories", "name slug")
      .populate("applicableCollections", "name slug")
      .populate("applicableCustomerSegments", "name slug type")
      .lean();

    if (!discount) {
      return NextResponse.json(
        { success: false, error: "Promotion not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      discount,
    });
  } catch (error) {
    console.error("❌ [API /api/discounts/[id] GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch discount" },
      { status: error.status || 500 }
    );
  }
}

/**
 * PATCH /api/discounts/[id]
 * Update an existing discount.
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission(["discounts.update", "marketing.manage"]);
    const { id } = await params;
    const body = await request.json();

    const updated = await updateDiscount(id, body, user);

    return NextResponse.json({
      success: true,
      discount: updated,
      message: `Promotion '${updated.name}' updated successfully`,
    });
  } catch (error) {
    console.error("❌ [API /api/discounts/[id] PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update discount" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/discounts/[id]
 * Delete promotion permanently if safe, or reject with archive instruction.
 */
export async function DELETE(request, { params }) {
  try {
    const user = await assertPermission(["discounts.archive", "marketing.manage"]);
    const { id } = await params;

    const result = await deleteDiscount(id, user);

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ [API /api/discounts/[id] DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete discount" },
      { status: error.status || 500 }
    );
  }
}
