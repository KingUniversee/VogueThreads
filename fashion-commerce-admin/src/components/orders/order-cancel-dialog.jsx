"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

const CANCELLATION_REASONS = [
  "Customer Requested Cancellation",
  "Incorrect Delivery Address / Pincode",
  "Duplicate Order Placed",
  "Customer Unreachable / Failed Verification",
  "Suspected Fraudulent Activity",
  "Inventory Discontinued / Damaged",
  "Pricing or Discount System Error",
  "Other Operational Reason",
];

export function OrderCancelDialog({ open, onOpenChange, order, onOrderCancelled }) {
  const [reason, setReason] = useState(CANCELLATION_REASONS[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const handleCancel = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${order._id || order.orderNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to cancel order");
      }

      toast.success(`Order ${order.orderNumber} has been cancelled`);
      if (onOrderCancelled) onOrderCancelled(data.order);
      onOpenChange(false);
      setNotes("");
    } catch (err) {
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Cancel Order
          </DialogTitle>
          <DialogDescription>
            Cancel customer order <span className="font-semibold text-foreground">{order.orderNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCancel} className="space-y-4 py-2">
          {/* Warehouse Stock Warning */}
          <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-400 text-xs flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Automatic Stock Release</p>
              <p className="mt-0.5 opacity-90">
                Cancelling this order will automatically release all reserved units back into
                available warehouse stock and log an audit trail transaction.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cancellation Reason *
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Details / Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal record of why order was cancelled..."
              rows={3}
              className="w-full p-2.5 rounded-md border text-sm bg-background resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Back
            </Button>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
