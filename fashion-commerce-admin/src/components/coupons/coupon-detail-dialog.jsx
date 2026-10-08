"use client";

import React from "react";
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
import { formatINR, formatDate } from "@/lib/formatters";
import { TicketPercent, Calendar, Users, Target, ShieldAlert, CheckCircle2 } from "lucide-react";

export function CouponDetailDialog({ open, onOpenChange, coupon = null }) {
  if (!coupon) return null;

  const isExpired = coupon.endAt && new Date(coupon.endAt) < new Date();
  const isScheduled = coupon.startAt && new Date(coupon.startAt) > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <TicketPercent className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-mono tracking-wide text-slate-900">
                  {coupon.code}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {coupon.description || "No description provided"}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant={
                coupon.status === "ACTIVE" && !isExpired
                  ? "success"
                  : coupon.status === "ARCHIVED"
                  ? "secondary"
                  : "destructive"
              }
              className="text-xs uppercase"
            >
              {isExpired ? "EXPIRED" : isScheduled ? "SCHEDULED" : coupon.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Discount</span>
              <span className="text-sm font-bold text-slate-900">
                {coupon.discountType === "PERCENTAGE"
                  ? `${coupon.discountValue}% OFF`
                  : formatINR(coupon.discountValue, false) + " OFF"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Min Order Value</span>
              <span className="text-sm font-bold text-slate-900">
                {coupon.minimumOrderValue > 0 ? formatINR(coupon.minimumOrderValue, false) : "None"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Redemptions</span>
              <span className="text-sm font-bold text-slate-900">
                {coupon.usageCount || 0} / {coupon.usageLimit ? coupon.usageLimit : "∞"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 block">Per-Customer</span>
              <span className="text-sm font-bold text-slate-900">
                Max {coupon.perCustomerUsageLimit || 1}x
              </span>
            </div>
          </div>

          {/* Validity & Constraints */}
          <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2.5">
            <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              Promotion Schedule & Caps
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="font-medium text-slate-700">Start Date: </span>
                {formatDate(coupon.startAt)}
              </div>
              <div>
                <span className="font-medium text-slate-700">Expiration: </span>
                {coupon.endAt ? formatDate(coupon.endAt) : "Never expires"}
              </div>
              {coupon.discountType === "PERCENTAGE" && (
                <div>
                  <span className="font-medium text-slate-700">Max Discount: </span>
                  {coupon.maximumDiscountAmount ? formatINR(coupon.maximumDiscountAmount, false) : "No cap"}
                </div>
              )}
              <div>
                <span className="font-medium text-slate-700">First Order Only: </span>
                {coupon.firstOrderOnly ? "Yes (New customers only)" : "No (All eligible orders)"}
              </div>
            </div>
          </div>

          {/* Catalog Targeting Details */}
          <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-2.5">
            <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-slate-500" />
              Target Inclusions
            </h4>

            {(!coupon.applicableCategories?.length &&
              !coupon.applicableCollections?.length &&
              !coupon.applicableProducts?.length &&
              !coupon.applicableCustomerSegments?.length) ? (
              <p className="text-slate-500 italic">
                Storewide coupon — applicable to all eligible fashion catalog items.
              </p>
            ) : (
              <div className="space-y-2">
                {coupon.applicableCategories?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">Categories:</span>
                    <div className="flex flex-wrap gap-1">
                      {coupon.applicableCategories.map((c, i) => (
                        <Badge key={i} variant="outline">
                          {c.name || c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {coupon.applicableCollections?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">Collections:</span>
                    <div className="flex flex-wrap gap-1">
                      {coupon.applicableCollections.map((col, i) => (
                        <Badge key={i} variant="outline">
                          {col.name || col}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {coupon.applicableCustomerSegments?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">Customer Segments:</span>
                    <div className="flex flex-wrap gap-1">
                      {coupon.applicableCustomerSegments.map((seg, i) => (
                        <Badge key={i} variant="secondary">
                          {seg.name || seg}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
