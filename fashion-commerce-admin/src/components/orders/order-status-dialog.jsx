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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getNextAvailableStatuses, getStatusConfig } from "@/lib/order-status";
import { RefreshCw, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const CARRIERS = [
  { id: "DELHIVERY", label: "Delhivery Surface / Express" },
  { id: "SHIPROCKET", label: "Shiprocket Multi-Courier" },
  { id: "BLUEDART", label: "BlueDart Express" },
  { id: "XPRESSBEES", label: "Xpressbees Logistics" },
  { id: "DTDC", label: "DTDC Courier" },
  { id: "SHADOWFAX", label: "Shadowfax Hyperlocal" },
  { id: "OTHER", label: "Other / Hand Delivery" },
];

export function OrderStatusDialog({ open, onOpenChange, order, onStatusUpdated }) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [carrier, setCarrier] = useState(order?.fulfillment?.carrier || "DELHIVERY");
  const [awbNumber, setAwbNumber] = useState(order?.fulfillment?.awbNumber || "");
  const [trackingUrl, setTrackingUrl] = useState(order?.fulfillment?.trackingUrl || "");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const currentConfig = getStatusConfig(order.status);
  const nextStatuses = getNextAvailableStatuses(order.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStatus) {
      toast.error("Please select a target status");
      return;
    }

    if (selectedStatus === "SHIPPED" && !awbNumber.trim()) {
      toast.error("AWB / Tracking number is required when shipping an order");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order._id || order.orderNumber}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          note: note.trim(),
          carrier: selectedStatus === "SHIPPED" ? carrier : undefined,
          awbNumber: selectedStatus === "SHIPPED" ? awbNumber.trim() : undefined,
          trackingUrl: selectedStatus === "SHIPPED" ? trackingUrl.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update order status");
      }

      toast.success(`Order ${order.orderNumber} transitioned to ${selectedStatus}`);
      if (onStatusUpdated) onStatusUpdated(data.order);
      onOpenChange(false);
      setSelectedStatus("");
      setNote("");
    } catch (err) {
      toast.error(err.message || "Failed to transition order status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Update Order Status
          </DialogTitle>
          <DialogDescription>
            Advance order lifecycle state for{" "}
            <span className="font-semibold text-foreground">{order.orderNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Current Status Banner */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/40 text-sm">
            <span className="text-muted-foreground">Current Status:</span>
            <Badge variant={currentConfig.badgeVariant} className={currentConfig.color}>
              {currentConfig.label}
            </Badge>
          </div>

          {/* Target Status Selector */}
          {nextStatuses.length === 0 ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Terminal Order State</p>
                <p className="text-xs text-amber-600/90 dark:text-amber-400/80 mt-0.5">
                  This order is in a terminal state ({order.status}) and cannot be transitioned
                  further.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Next Allowed Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select target status..." />
                </SelectTrigger>
                <SelectContent>
                  {nextStatuses.map((s) => {
                    const cfg = getStatusConfig(s);
                    return (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cfg.label}</span>
                          <span className="text-xs text-muted-foreground">({s})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Shipping Fields if moving to SHIPPED */}
          {selectedStatus === "SHIPPED" && (
            <div className="space-y-3 p-3.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                <Truck className="h-4 w-4" />
                Dispatch & Carrier Logistics
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Logistics Carrier</label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">AWB / Tracking Number *</label>
                <input
                  type="text"
                  required
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  placeholder="e.g. DEL-994821038"
                  className="w-full h-9 px-3 rounded-md border text-sm bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tracking URL (Optional)</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://delhivery.com/track/..."
                  className="w-full h-9 px-3 rounded-md border text-sm bg-background"
                />
              </div>

              <p className="text-xs text-cyan-800/80 dark:text-cyan-400/80">
                ℹ️ Transitioning to SHIPPED will commit physical warehouse stock fulfillment and deduct
                units from on-hand inventory.
              </p>
            </div>
          )}

          {/* Internal Transition Note */}
          {nextStatuses.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Transition Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason or dispatch note..."
                rows={2}
                className="w-full p-2.5 rounded-md border text-sm bg-background resize-none"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            {nextStatuses.length > 0 && (
              <Button type="submit" disabled={!selectedStatus || loading}>
                {loading ? "Updating..." : "Update Status"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
