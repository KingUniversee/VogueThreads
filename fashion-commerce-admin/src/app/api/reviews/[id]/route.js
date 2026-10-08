import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Review from "@/models/Review";
import AuditLog from "@/models/AuditLog";

/**
 * GET /api/reviews/[id]
 * Fetch single review detail with populated product, customer, and order references
 */
export async function GET(request, { params }) {
  try {
    await assertPermission("reviews.moderate");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid review ID" }, { status: 400 });
    }

    const review = await Review.findById(id)
      .populate("productId", "title primaryImages slug price sku")
      .populate("customerId", "firstName lastName email avatar status")
      .populate("orderId", "orderNumber status pricing createdAt")
      .lean();

    if (!review) {
      return NextResponse.json({ success: false, error: `Review '${id}' not found` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error) {
    console.error("❌ [API /api/reviews/[id] GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch review" },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id]
 * Permanently delete a review (e.g. spam/abuse)
 */
export async function DELETE(request, { params }) {
  try {
    const user = await assertPermission("reviews.moderate");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid review ID" }, { status: 400 });
    }

    const review = await Review.findById(id);
    if (!review) {
      return NextResponse.json({ success: false, error: `Review '${id}' not found` }, { status: 404 });
    }

    await Review.findByIdAndDelete(id);

    try {
      await AuditLog.create({
        actorEmail: user.email || "admin@voguethreads.in",
        action: "REVIEW_DELETE",
        resource: "Review",
        resourceId: String(id),
        details: {
          productId: String(review.productId),
          customerEmail: review.customerEmail,
          rating: review.rating,
        },
      });
    } catch (e) {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      message: "Review successfully deleted",
    });
  } catch (error) {
    console.error("❌ [API /api/reviews/[id] DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete review" },
      { status: error.status || 500 }
    );
  }
}
