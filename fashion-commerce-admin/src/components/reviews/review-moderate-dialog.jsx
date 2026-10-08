"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, EyeOff, Clock } from "lucide-react";

export function ReviewModerateDialog({ open, onOpenChange, review = null, onSuccess }) {
  const [selectedStatus, setSelectedStatus] = useState("APPROVED");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (review) {
      setSelectedStatus(review.status || "APPROVED");
      setReason(review.moderationReason || "");
    }
  }, [review, open]);

  if (!review) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${review._id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to moderate review");
      }

      toast.success(`Review marked as ${selectedStatus}`);
      onOpenChange(false);
      if (onSuccess) onSuccess(data.review);
    } catch (err) {
      console.error("Moderate review error:", err);
      toast.error(err.message || "Failed to moderate review");
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = [
    {
      id: "APPROVED",
      title: "Approve Review",
      desc: "Review is published and visible on product detail pages in storefront.",
      icon: CheckCircle2,
      borderClass: "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
      activeClass: "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500",
      iconClass: "text-emerald-600",
    },
    {
      id: "PENDING",
      title: "Hold in Pending",
      desc: "Awaiting further moderation or automated fraud verification.",
      icon: Clock,
      borderClass: "border-amber-200 bg-amber-50/50 hover:border-amber-300",
      activeClass: "border-amber-500 bg-amber-50 ring-1 ring-amber-500",
      iconClass: "text-amber-600",
    },
    {
      id: "REJECTED",
      title: "Reject Review",
      desc: "Rejected due to vulgarity, non-product feedback, or guideline violation.",
      icon: XCircle,
      borderClass: "border-rose-200 bg-rose-50/50 hover:border-rose-300",
      activeClass: "border-rose-500 bg-rose-50 ring-1 ring-rose-500",
      iconClass: "text-rose-600",
    },
    {
      id: "HIDDEN",
      title: "Hide Review",
      desc: "Conceal temporarily from storefront without permanent deletion.",
      icon: EyeOff,
      borderClass: "border-slate-200 bg-slate-50/50 hover:border-slate-300",
      activeClass: "border-slate-500 bg-slate-100 ring-1 ring-slate-500",
      iconClass: "text-slate-600",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Moderate Customer Review</DialogTitle>
          <DialogDescription>
            Update review visibility for{" "}
            <span className="font-semibold text-slate-800">{review.customerName}</span>&apos;s{" "}
            {review.rating}-star review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            {statusOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedStatus === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedStatus(opt.id)}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                    isSelected ? opt.activeClass : opt.borderClass
                  }`}
                >
                  <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${opt.iconClass}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900">{opt.title}</p>
                      {review.status === opt.id && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-600 leading-snug">{opt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Internal Moderation Note</label>
            <Textarea
              placeholder="e.g. Verified authentic feedback or contains abusive external links."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Decision
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
