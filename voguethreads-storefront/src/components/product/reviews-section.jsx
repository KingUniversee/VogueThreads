"use client";

import React, { useState } from "react";
import { Star, CheckCircle, ThumbsUp, MessageSquare, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function ReviewsSection({
  productId,
  productTitle,
  initialReviews = [],
  metrics = { averageRating: 5.0, reviewCount: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState(new Set());

  const totalReviews = metrics.reviewCount || reviews.length;
  const avg = metrics.averageRating || 5.0;

  const handleVoteHelpful = (reviewId) => {
    if (helpfulVoted.has(reviewId)) return;
    setHelpfulVoted((prev) => new Set([...prev, reviewId]));
    setReviews((prev) =>
      prev.map((r) =>
        r._id === reviewId ? { ...r, helpfulVotes: (r.helpfulVotes || 0) + 1 } : r
      )
    );
    toast.success("Thank you for your feedback!");
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !content.trim()) {
      toast.error("Please complete all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          customerName: name.trim(),
          customerEmail: email.trim(),
          rating,
          title: title.trim() || "Verified Purchase",
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Review Submitted", {
          description: "Thank you! Your review is pending approval and will appear shortly.",
        });
        // Optimistically show in UI
        setReviews((prev) => [
          {
            _id: `temp-${Date.now()}`,
            customerName: name.trim(),
            rating,
            title: title.trim() || "Verified Purchase",
            content: content.trim(),
            isVerifiedBuyer: true,
            createdAt: new Date().toISOString(),
            helpfulVotes: 0,
          },
          ...prev,
        ]);
        setIsModalOpen(false);
        setName("");
        setEmail("");
        setTitle("");
        setContent("");
      } else {
        toast.error(data.error || "Failed to submit review.");
      }
    } catch (err) {
      toast.error("An error occurred while submitting review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Header with Breakdown */}
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between p-6 sm:p-8 rounded-3xl bg-surface border border-border/70">
        {/* Rating Score Summary */}
        <div className="flex items-center gap-5">
          <div className="text-center">
            <span className="text-4xl sm:text-5xl font-black text-text-primary tracking-tight">
              {avg}
            </span>
            <div className="flex items-center justify-center gap-1 text-amber-500 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-text-muted mt-1 block">
              Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
            </span>
          </div>

          <div className="h-16 w-px bg-border/60 hidden sm:block" />

          {/* Star Distribution Bars */}
          <div className="space-y-1.5 min-w-[200px] sm:min-w-[240px]">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = metrics.ratingDistribution?.[star] || 0;
              const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-text-muted font-medium">{star}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 h-2 rounded-full bg-[#EDEDF0] overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-text-muted text-[11px]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Write Review Trigger Button */}
        <div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Write a Review
          </Button>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[#F8F7F4] border border-[#E5E2DC]">
            <MessageSquare className="w-8 h-8 mx-auto text-[#8E8E93] mb-2 opacity-60" />
            <p className="text-sm font-medium text-[#141414]">No customer reviews yet</p>
            <p className="text-xs text-[#5A5A5E] mt-1">
              Be the first to share your experience with this piece.
            </p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev._id}
              className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E2DC] space-y-3 transition-colors hover:border-[#141414]/30 shadow-xs"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[#141414]">
                      {rev.customerName}
                    </span>
                    {rev.isVerifiedBuyer && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-amber-500 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <span className="text-xs text-[#8E8E93]">
                  {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                </span>
              </div>

              {rev.title && (
                <h4 className="font-bold text-sm text-[#141414]">{rev.title}</h4>
              )}

              <p className="text-xs sm:text-sm text-[#5A5A5E] leading-relaxed">
                {rev.content}
              </p>

              {/* Admin Response if available */}
              {rev.adminResponse && rev.adminResponse.response && (
                <div className="mt-3 p-3.5 rounded-xl bg-[#F8F7F4] border border-[#E5E2DC] text-xs text-[#5A5A5E] space-y-1">
                  <span className="font-semibold text-[#141414] block">
                    Response from {rev.adminResponse.respondedBy || "VogueThreads Concierge"}:
                  </span>
                  <p>{rev.adminResponse.response}</p>
                </div>
              )}

              {/* Helpful Votes */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleVoteHelpful(rev._id)}
                  disabled={helpfulVoted.has(rev._id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                    helpfulVoted.has(rev._id)
                      ? "bg-[#141414] text-white border-[#141414]"
                      : "text-[#5A5A5E] border-[#E5E2DC] bg-white hover:text-[#141414] hover:bg-[#F3F2EE]"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Helpful ({rev.helpfulVotes || 0})</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Write Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

          <div className="relative w-full max-w-lg bg-surface rounded-3xl shadow-2xl border border-border/80 overflow-hidden z-10 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-5">
              <div>
                <h3 className="text-lg font-bold text-text-primary">Write a Review</h3>
                <p className="text-xs text-text-muted line-clamp-1">{productTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-surface hover:bg-neutral-100 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Star Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
                  Rating *
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(s)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= (hoverRating || rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-neutral-300"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-text-muted ml-2 font-medium">
                    {hoverRating || rating} out of 5 stars
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
                  Review Headline
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Unmatched drape, perfect collar"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Review Content */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
                  Review Feedback *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="How does the fabric feel? What was the fit like?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              {/* Customer Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
                    Your Name *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Aarav Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-1.5">
                    Your Email *
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="aarav@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Submit Review
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
