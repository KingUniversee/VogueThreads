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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, AlertTriangle, Boxes } from "lucide-react";
import { formatINR } from "@/lib/formatters";
import { toast } from "sonner";

const RETURN_REASONS = [
  "Size / Fit Issue",
  "Fabric Quality / Color Mismatch",
  "Damaged / Defective on Arrival",
  "Received Wrong Item / Variant",
  "Customer Changed Mind",
  "Delivery Delay / Missed Event",
];

export function OrderReturnDialog({ open, onOpenChange, order, onReturnProcessed }) {
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [condition, setCondition] = useState("GOOD");
  const [restock, setRestock] = useState(true);
  const [refundAmount, setRefundAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize or reset selections when dialog opens
  React.useEffect(() => {
    if (order?.items) {
      const initial = {};
      let totalAmount = 0;
      order.items.forEach((item) => {
        initial[item.sku] = {
          selected: true,
          quantity: item.quantity,
          maxQuantity: item.quantity,
          title: item.title,
          unitPrice: item.unitPrice,
        };
        totalAmount += item.total || item.unitPrice * item.quantity;
      });
      setSelectedItems(initial);
      setRefundAmount(totalAmount);
    }
  }, [order]);

  if (!order) return null;

  const toggleItem = (sku) => {
    setSelectedItems((prev) => {
      const current = prev[sku] || {};
      const newSelected = !current.selected;
      const updated = {
        ...prev,
        [sku]: { ...current, selected: newSelected },
      };

      // Recalculate suggested refund
      let suggestedRefund = 0;
      Object.keys(updated).forEach((k) => {
        if (updated[k].selected) {
          suggestedRefund += updated[k].unitPrice * updated[k].quantity;
        }
      });
      setRefundAmount(suggestedRefund);

      return updated;
    });
  };

  const updateQuantity = (sku, qty) => {
    setSelectedItems((prev) => {
      const current = prev[sku];
      const validQty = Math.max(1, Math.min(current.maxQuantity, Number(qty) || 1));
      const updated = {
        ...prev,
        [sku]: { ...current, quantity: validQty },
      };

      let suggestedRefund = 0;
      Object.keys(updated).forEach((k) => {
        if (updated[k].selected) {
          suggestedRefund += updated[k].unitPrice * updated[k].quantity;
        }
      });
      setRefundAmount(suggestedRefund);

      return updated;
    });
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    const returnItems = [];

    Object.keys(selectedItems).forEach((sku) => {
      const item = selectedItems[sku];
      if (item.selected) {
        returnItems.push({
          sku,
          quantity: item.quantity,
          reason,
          condition,
        });
      }
    });

    if (returnItems.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order._id || order.orderNumber}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: returnItems,
          restock,
          refundAmount: Number(refundAmount) || 0,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process return");
      }

      toast.success(
        `Return processed for order ${order.orderNumber}. ${
          restock ? "Items restocked to inventory." : ""
        }`
      );
      if (onReturnProcessed) onReturnProcessed(data.order);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || "Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-600" />
            Process Customer Return
          </DialogTitle>
          <DialogDescription>
            Record returned apparel items for order{" "}
            <span className="font-semibold text-foreground">{order.orderNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReturn} className="space-y-4 py-2">
          {/* Item Checklist */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Returned Items
            </label>
            <div className="border rounded-lg divide-y bg-muted/20">
              {(order.items || []).map((item) => {
                const isSelected = selectedItems[item.sku]?.selected;
                const qty = selectedItems[item.sku]?.quantity || item.quantity;

                return (
                  <div key={item.sku} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(item.sku)}
                        id={`ret-${item.sku}`}
                      />
                      <label
                        htmlFor={`ret-${item.sku}`}
                        className="text-sm cursor-pointer min-w-0"
                      >
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.color} / {item.size} • SKU: {item.sku}
                        </p>
                      </label>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          max={item.quantity}
                          value={qty}
                          onChange={(e) => updateQuantity(item.sku, e.target.value)}
                          className="w-14 h-8 px-2 text-center rounded border text-sm bg-background"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Return Reason
              </label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Item Condition
              </label>
              <Select
                value={condition}
                onValueChange={(val) => {
                  setCondition(val);
                  if (val === "GOOD") setRestock(true);
                  else setRestock(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOOD">Good / Restockable</SelectItem>
                  <SelectItem value="DAMAGED">Damaged / Defective</SelectItem>
                  <SelectItem value="OPENED">Worn / Seal Broken</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Restock Toggle */}
          <div className="p-3.5 rounded-lg border bg-muted/40 flex items-start gap-3">
            <Checkbox
              checked={restock}
              onCheckedChange={setRestock}
              id="restock-checkbox"
              className="mt-0.5"
            />
            <label htmlFor="restock-checkbox" className="text-xs cursor-pointer space-y-0.5">
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <Boxes className="h-3.5 w-3.5 text-primary" />
                Restock Units to Warehouse Inventory
              </span>
              <p className="text-muted-foreground">
                When enabled, the returned units will immediately be added back to physical on-hand
                and sellable stock with an immutable ledger entry.
              </p>
            </label>
          </div>

          {/* Refund Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Refund Amount (INR)
              </label>
              <span className="text-xs text-muted-foreground">
                Max: {formatINR(order.pricing?.grandTotal || 0)}
              </span>
            </div>
            <input
              type="number"
              min="0"
              max={order.pricing?.grandTotal || 0}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full h-9 px-3 rounded-md border text-sm bg-background font-mono"
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Inspection Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tag status, packaging condition, QA inspector comments..."
              rows={2}
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
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Complete Return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
