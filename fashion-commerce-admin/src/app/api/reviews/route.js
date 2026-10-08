import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongoose";
import { assertPermission } from "@/lib/auth";
import Review from "@/models/Review";
import Product from "@/models/Product";
import Customer from "@/models/Customer";
import { getReviewMetrics } from "@/lib/review-service";

/**
 * GET /api/reviews
 * List reviews with rating filtering, status filtering, product filtering, search, and summary telemetry
 */
export async function GET(request) {
  try {
    await assertPermission("reviews.moderate");
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const rating = searchParams.get("rating") || "ALL";
    const productId = searchParams.get("productId") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));

    const filter = {};

    if (status !== "ALL") {
      filter.status = status;
    }

    if (rating !== "ALL") {
      filter.rating = Number(rating);
    }

    if (productId) {
      filter.productId = productId;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { customerName: regex },
        { customerEmail: regex },
        { title: regex },
        { content: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [reviews, totalCount, metrics] = await Promise.all([
      Review.find(filter)
        .populate("productId", "title primaryImages slug")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      getReviewMetrics(),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
      metrics,
    });
  } catch (error) {
    console.error("❌ [API /api/reviews GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch reviews" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Create a new product review
 */
export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      productId,
      customerId,
      customerName,
      customerEmail,
      variantSku,
      orderId,
      rating,
      title = "",
      content,
      images = [],
      status = "PENDING",
    } = body;

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    if (!customerName || !customerEmail) {
      return NextResponse.json(
        { success: false, error: "Customer name and email are required" },
        { status: 400 }
      );
    }

    const parsedRating = Number(rating);
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be a whole number between 1 and 5" },
        { status: 400 }
      );
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Review content cannot be empty" },
        { status: 400 }
      );
    }

    // Check if customer is a verified buyer
    let isVerifiedBuyer = false;
    if (orderId) {
      isVerifiedBuyer = true;
    }

    const newReview = await Review.create({
      productId,
      customerId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      variantSku: variantSku ? variantSku.trim().toUpperCase() : undefined,
      orderId,
      isVerifiedBuyer,
      rating: parsedRating,
      title: title.trim(),
      content: content.trim(),
      images,
      status,
    });

    return NextResponse.json({
      success: true,
      review: newReview,
    });
  } catch (error) {
    console.error("❌ [API /api/reviews POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create review" },
      { status: error.status || 500 }
    );
  }
}
