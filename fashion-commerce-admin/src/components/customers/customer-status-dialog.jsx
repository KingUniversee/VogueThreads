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
import { Loader2, ShieldAlert, CheckCircle2, UserX } from "lucide-react";

export function CustomerStatusDialog({ open, onOpenChange, customer = null, onSuccess }) {
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setSelectedStatus(customer.status || "ACTIVE");
    }
    setReason("");
  }, [customer, open]);

  if (!customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customer._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update customer status");
      }

      toast.success(`Customer status updated to ${selectedStatus}`);
      onOpenChange(false);
      if (onSuccess) onSuccess(data.customer);
    } catch (err) {
      console.error("Change status error:", err);
      toast.error(err.message || "Failed to change status");
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = [
    {
      id: "ACTIVE",
      title: "Active",
      desc: "Shopper can place orders, submit reviews, and receive communications.",
      icon: CheckCircle2,
      borderClass: "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
      activeClass: "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500",
      iconClass: "text-emerald-600",
    },
    {
      id: "INACTIVE",
      title: "Inactive",
      desc: "Shopper account is dormant or paused. Can be reactivated anytime.",
      icon: UserX,
      borderClass: "border-amber-200 bg-amber-50/50 hover:border-amber-300",
      activeClass: "border-amber-500 bg-amber-50 ring-1 ring-amber-500",
      iconClass: "text-amber-600",
    },
    {
      id: "BLOCKED",
      title: "Blocked",
      desc: "Account flagged for fraud, frequent abuse, or chargeback violation. Order placement disabled.",
      icon: ShieldAlert,
      borderClass: "border-rose-200 bg-rose-50/50 hover:border-rose-300",
      activeClass: "border-rose-500 bg-rose-50 ring-1 ring-rose-500",
      iconClass: "text-rose-600",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Customer Status</DialogTitle>
          <DialogDescription>
            Change the account status for{" "}
            <span className="font-semibold text-slate-800">
              {customer.firstName} {customer.lastName}
            </span>{" "}
            ({customer.email}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2.5">
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
                      {customer.status === opt.id && (
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
            <label className="text-xs font-semibold text-slate-700">Reason or Internal Note</label>
            <Textarea
              placeholder="e.g. Verified genuine account resolution or flagged suspicious payment."
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
              Update Status
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
