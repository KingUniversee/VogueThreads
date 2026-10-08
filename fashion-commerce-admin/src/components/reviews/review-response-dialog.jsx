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
import { toast } from "sonner";
import { Loader2, MessageSquare, Send } from "lucide-react";

export function ReviewResponseDialog({ open, onOpenChange, review = null, onSuccess }) {
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (review) {
      setResponse(review.adminResponse?.response || "");
    }
  }, [review, open]);

  if (!review) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!response.trim()) {
      toast.error("Response message cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${review._id}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: response.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit official response");
      }

      toast.success("Official store response published");
      onOpenChange(false);
      if (onSuccess) onSuccess(data.review);
    } catch (err) {
      console.error("Store response error:", err);
      toast.error(err.message || "Failed to publish response");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            Official Store Response
          </DialogTitle>
          <DialogDescription>
            Post a public message from VogueThreads customer care answering{" "}
            <span className="font-semibold text-slate-800">{review.customerName}</span>&apos;s review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Customer review excerpt */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs space-y-1">
            <p className="font-semibold text-slate-800">
              {review.title || `${review.rating}-Star Feedback`}
            </p>
            <p className="text-slate-600 line-clamp-3 italic">&ldquo;{review.content}&rdquo;</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Official Store Message *</label>
            <Textarea
              placeholder="Dear customer, thank you for sharing your feedback! We are thrilled you love the fit..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
              className="resize-none text-xs"
              disabled={submitting}
            />
            <p className="text-[11px] text-slate-500">
              This response will appear publicly beneath the customer review on the product page.
            </p>
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
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-3.5 w-3.5" />
              )}
              Publish Response
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
