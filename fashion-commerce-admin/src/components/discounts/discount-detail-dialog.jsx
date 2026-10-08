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
import { BadgePercent, Calendar, Target, Layers } from "lucide-react";

export function DiscountDetailDialog({ open, onOpenChange, discount = null }) {
  if (!discount) return null;

  const isExpired = discount.endAt && new Date(discount.endAt) < new Date();
  const isScheduled = discount.startAt && new Date(discount.startAt) > new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600">
                <BadgePercent className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {discount.name}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {discount.description || "No description provided"}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant={
                discount.status === "ACTIVE" && !isExpired
                  ? "success"
                  : discount.status === "ARCHIVED"
                  ? "secondary"
                  : "destructive"
              }
              className="text-xs uppercase"
            >
              {isExpired ? "EXPIRED" : isScheduled ? "SCHEDULED" : discount.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block">Discount</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {discount.discountType === "PERCENTAGE"
                  ? `${discount.discountValue}% OFF`
                  : formatINR(discount.discountValue, false) + " OFF"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block">Priority Rank</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                #{discount.priority || 10}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block">Stacking</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {discount.stacking || "EXCLUSIVE"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 block">Min Order Value</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {discount.minimumOrderValue > 0 ? formatINR(discount.minimumOrderValue, false) : "None"}
              </span>
            </div>
          </div>

          {/* Schedule & Caps */}
          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              Promotion Schedule & Caps
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Start Date: </span>
                {formatDate(discount.startAt)}
              </div>
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Expiration: </span>
                {discount.endAt ? formatDate(discount.endAt) : "Never expires"}
              </div>
              {discount.discountType === "PERCENTAGE" && (
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">Max Discount: </span>
                  {discount.maximumDiscountAmount ? formatINR(discount.maximumDiscountAmount, false) : "No cap"}
                </div>
              )}
            </div>
          </div>

          {/* Catalog Targeting Details */}
          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-slate-500" />
              Target Inclusions
            </h4>

            {(!discount.applicableCategories?.length &&
              !discount.applicableCollections?.length &&
              !discount.applicableProducts?.length &&
              !discount.applicableCustomerSegments?.length) ? (
              <p className="text-slate-500 italic">
                Storewide promotion — automatically applies to all eligible products in cart.
              </p>
            ) : (
              <div className="space-y-2">
                {discount.applicableCategories?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">Categories:</span>
                    <div className="flex flex-wrap gap-1">
                      {discount.applicableCategories.map((c, i) => (
                        <Badge key={i} variant="outline">
                          {c.name || c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {discount.applicableCollections?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">Collections:</span>
                    <div className="flex flex-wrap gap-1">
                      {discount.applicableCollections.map((col, i) => (
                        <Badge key={i} variant="outline">
                          {col.name || col}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {discount.applicableCustomerSegments?.length > 0 && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-500 block mb-1">Customer Segments:</span>
                    <div className="flex flex-wrap gap-1">
                      {discount.applicableCustomerSegments.map((seg, i) => (
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
