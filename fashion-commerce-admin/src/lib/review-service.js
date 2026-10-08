import mongoose from "mongoose";
import { connectToDatabase } from "./mongoose.js";
import Review from "../models/Review.js";
import AuditLog from "../models/AuditLog.js";

/**
 * Aggregate summary metrics across product reviews
 */
export async function getReviewMetrics() {
  await connectToDatabase();

  const [aggregates, statusCounts] = await Promise.all([
    Review.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgRating: {
            $avg: {
              $cond: [{ $eq: ["$status", "APPROVED"] }, "$rating", null],
            },
          },
        },
      },
    ]),
    Review.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const summary = aggregates[0] || { totalReviews: 0, avgRating: 0 };
  const countsByStatus = {};
  statusCounts.forEach((s) => {
    countsByStatus[s._id] = s.count;
  });

  return {
    totalReviews: summary.totalReviews || 0,
    averageRating: summary.avgRating ? Number(summary.avgRating.toFixed(1)) : 0,
    pending: countsByStatus.PENDING || 0,
    approved: countsByStatus.APPROVED || 0,
    rejected: countsByStatus.REJECTED || 0,
    hidden: countsByStatus.HIDDEN || 0,
  };
}

/**
 * Update review moderation state and log administrative audit trail
 */
export async function moderateReview(reviewId, targetStatus, reason, admin) {
  await connectToDatabase();

  const review = await Review.findById(reviewId);
  if (!review) {
    const err = new Error(`Review '${reviewId}' not found`);
    err.status = 404;
    throw err;
  }

  const previousStatus = review.status;
  const adminEmail = admin?.email || "admin@voguethreads.in";

  review.status = targetStatus;
  review.moderatedBy = adminEmail;
  review.moderatedAt = new Date();
  if (reason) review.moderationReason = reason.trim();

  await review.save();

  // AuditLog
  try {
    await AuditLog.create({
      actorId: admin?.id ? new mongoose.Types.ObjectId(admin.id) : undefined,
      actorEmail: adminEmail,
      action: "REVIEW_MODERATE",
      resource: "Review",
      resourceId: String(review._id),
      details: {
        productId: String(review.productId),
        rating: review.rating,
        before: { status: previousStatus },
        after: { status: targetStatus },
        reason,
      },
    });
  } catch (e) {
    // Non-fatal
  }

  return review;
}

/**
 * Post public official store response to a review
 */
export async function postAdminResponse(reviewId, responseText, admin) {
  await connectToDatabase();

  const review = await Review.findById(reviewId);
  if (!review) {
    const err = new Error(`Review '${reviewId}' not found`);
    err.status = 404;
    throw err;
  }

  const adminEmail = admin?.email || "admin@voguethreads.in";

  review.adminResponse = {
    response: responseText.trim(),
    respondedBy: adminEmail,
    respondedAt: new Date(),
    isPublic: true,
  };

  await review.save();

  try {
    await AuditLog.create({
      actorId: admin?.id ? new mongoose.Types.ObjectId(admin.id) : undefined,
      actorEmail: adminEmail,
      action: "REVIEW_RESPONSE",
      resource: "Review",
      resourceId: String(review._id),
      details: {
        responsePreview: responseText.slice(0, 100),
      },
    });
  } catch (e) {
    // Non-fatal
  }

  return review;
}
