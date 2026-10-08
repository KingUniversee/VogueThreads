import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import { postAdminResponse } from "@/lib/review-service";

/**
 * POST /api/reviews/[id]/response
 * Post or update official administrative response to a review
 */
export async function POST(request, { params }) {
  try {
    const user = await assertPermission("reviews.moderate");
    await connectToDatabase();

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid review ID" }, { status: 400 });
    }

    const body = await request.json();
    const { response } = body;

    if (!response || !response.trim()) {
      return NextResponse.json(
        { success: false, error: "Response message cannot be empty" },
        { status: 400 }
      );
    }

    const updatedReview = await postAdminResponse(id, response, user);

    return NextResponse.json({
      success: true,
      review: updatedReview,
    });
  } catch (error) {
    console.error("❌ [API /api/reviews/[id]/response POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to post review response" },
      { status: error.status || 500 }
    );
  }
}
