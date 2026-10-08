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
import { CreditCard, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import { toast } from "sonner";

const REFUND_REASONS = [
  "Customer Return Accepted",
  "Order Cancellation Pre-Dispatch",
  "Out of Stock Item / Partial Fulfillment",
  "Customer Goodwill / Concession",
  "Payment Dispute / Duplicate Charge",
  "Other Financial Adjustment",
];

export function OrderRefundDialog({ open, onOpenChange, order, onRefundIssued }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);

  // Compute refundable limit
  const grandTotal = Number(order?.pricing?.grandTotal) || 0;
  const existingRefunds = (order?.refunds || []).reduce(
    (acc, r) => acc + (Number(r.amount) || 0),
    0
  );
  const remainingRefundable = Math.max(0, grandTotal - existingRefunds);

  React.useEffect(() => {
    if (remainingRefundable > 0 && !amount) {
      setAmount(String(remainingRefundable));
    }
  }, [remainingRefundable, amount]);

  if (!order) return null;

  const handleRefund = async (e) => {
    e.preventDefault();
    const parsedAmount = Number(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }

    if (parsedAmount > remainingRefundable) {
      toast.error(`Refund amount cannot exceed remaining balance of ${formatINR(remainingRefundable)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order._id || order.orderNumber}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedAmount,
          reason,
          reference: reference.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process refund");
      }

      toast.success(`Refund of ${formatINR(parsedAmount)} processed for order ${order.orderNumber}`);
      if (onRefundIssued) onRefundIssued(data.order);
      onOpenChange(false);
      setReference("");
    } catch (err) {
      toast.error(err.message || "Failed to issue refund");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CreditCard className="h-5 w-5" />
            Issue Customer Refund
          </DialogTitle>
          <DialogDescription>
            Record or issue refund for order{" "}
            <span className="font-semibold text-foreground">{order.orderNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRefund} className="space-y-4 py-2">
          {/* Balance Summary */}
          <div className="p-3.5 rounded-lg border bg-muted/40 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Grand Total:</span>
              <span className="font-medium text-foreground">{formatINR(grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already Refunded:</span>
              <span className="font-medium text-rose-600">{formatINR(existingRefunds)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t font-semibold">
              <span>Max Remaining Refundable:</span>
              <span className="text-emerald-600">{formatINR(remainingRefundable)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Refund Amount (INR) *
            </label>
            <input
              type="number"
              required
              min="1"
              max={remainingRefundable}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-9 px-3 rounded-md border text-sm bg-background font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Refund Reason *
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Gateway Reference / UTR
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. rfnd_1092841029 or UTR-994821"
              className="w-full h-9 px-3 rounded-md border text-sm bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Internal reference ID from your Razorpay / bank merchant dashboard.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || remainingRefundable <= 0}>
              {loading ? "Processing..." : "Process Refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
