import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import Review from "@/models/Review";

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { productId, customerName, customerEmail, rating, title, content } = body;

    if (!productId || !customerName || !customerEmail || !rating || !content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const reviewDoc = await Review.create({
      productId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.toLowerCase().trim(),
      rating: Math.max(1, Math.min(5, Number(rating))),
      title: title ? title.trim() : "Verified Purchase",
      content: content.trim(),
      isVerifiedBuyer: true,
      status: "APPROVED", // Auto-approve for smooth discovery experience
      helpfulVotes: 0,
    });

    return NextResponse.json({
      success: true,
      data: reviewDoc,
      message: "Review submitted successfully!",
    });
  } catch (err) {
    console.error("Review submission error:", err);
    return NextResponse.json(
      { success: false, error: "Server error submitting review." },
      { status: 500 }
    );
  }
}
