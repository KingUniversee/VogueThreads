import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import { moderateReview } from "@/lib/review-service";

/**
 * PATCH /api/reviews/[id]/moderate
 * Update review status: APPROVED, REJECTED, HIDDEN, PENDING
 */
export async function PATCH(request, { params }) {
  try {
    const user = await assertPermission("reviews.moderate");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid review ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status, reason = "" } = body;

    const validStatuses = ["APPROVED", "REJECTED", "HIDDEN", "PENDING"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid moderation status. Allowed: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const updatedReview = await moderateReview(id, status, reason, user);

    return NextResponse.json({
      success: true,
      review: updatedReview,
    });
  } catch (error) {
    console.error("❌ [API /api/reviews/[id]/moderate PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to moderate review" },
      { status: error.status || 500 }
    );
  }
}
