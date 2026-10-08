"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Search,
  RefreshCw,
  PlusCircle,
  XCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Warehouse,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";
import {
  getCanonicalThreshold,
  getUrgencyLevel,
  isSafetyAlert,
} from "@/lib/inventory-status";

export function LowStockView() {
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({
    totalAlerts: 0,
    outOfStock: 0,
    critical: 0,
    lowStock: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [filterTab, setFilterTab] = useState("ALL");
  const [search, setSearch] = useState("");

  // Adjustment Dialog
  const [adjustmentItem, setAdjustmentItem] = useState(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

  // Copy tracking
  const [copiedSku, setCopiedSku] = useState(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        filter: filterTab,
        search: search.trim(),
        _t: String(Date.now()),
      });

      const res = await fetch(`/api/inventory/low-stock?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const json = await res.json();

      if (json.success) {
        // Enforce single source of truth filter on items
        const freshAlerts = (json.data || []).filter((item) => {
          const thresh = getCanonicalThreshold(item);
          return isSafetyAlert(item.available, thresh);
        });
        setItems(freshAlerts);
        if (json.pagination) setPagination(json.pagination);
        if (json.metrics) setMetrics(json.metrics);
      }
    } catch (err) {
      console.error("Failed to load low stock alerts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filterTab, search]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleCopySku = (sku) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
  };

  const openQuickRestock = (item) => {
    setAdjustmentItem(item);
    setIsAdjustmentOpen(true);
  };

  const handleAdjustmentSuccess = async (updatedInv) => {
    if (updatedInv) {
      const thresh = getCanonicalThreshold(updatedInv);
      const isNowInStock = updatedInv.available > thresh;

      setItems((prevItems) => {
        if (isNowInStock) {
          // Immediately drop from the low-stock triage list
          return prevItems.filter((i) => i.variantSku !== updatedInv.variantSku);
        }
        return prevItems.map((i) =>
          i.variantSku === updatedInv.variantSku
            ? {
                ...i,
                onHand: updatedInv.onHand,
                reserved: updatedInv.reserved,
                available: updatedInv.available,
                threshold: thresh,
                lowStockThreshold: thresh,
                urgency: getUrgencyLevel(updatedInv.available, thresh),
              }
            : i
        );
      });
    }
    await loadAlerts();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Low Stock & Triage Alerts
            </h1>
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
              Warehouse Safety
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time replenishment dispatch station for apparel variants at or below warehouse safety levels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild className="text-xs border-slate-200">
            <Link href="/inventory">
              <Boxes className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Inventory Control
            </Link>
          </Button>

          <Button variant="outline" size="sm" asChild className="text-xs border-slate-200">
            <Link href="/inventory/adjustments">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Ledger History
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Alert Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Safety Alerts
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {metrics.totalAlerts}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">SKUs needing restock</p>
          </CardContent>
        </Card>

        <Card className="border border-rose-200 shadow-xs bg-rose-50/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Out of Stock (0 units)
              </span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-rose-700 font-mono mt-1">
              {metrics.outOfStock}
            </p>
            <p className="text-[11px] text-rose-600/70 mt-0.5">Lost sales risk</p>
          </CardContent>
        </Card>

        <Card className="border border-amber-200 shadow-xs bg-amber-50/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Critical (1-2 units)
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-800 font-mono mt-1">
              {metrics.critical}
            </p>
            <p className="text-[11px] text-amber-700/70 mt-0.5">Immediate reorder</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Low Stock (≤ Threshold)
              </span>
              <Boxes className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-700 font-mono mt-1">
              {metrics.lowStock}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Below buffer</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search low-stock SKU, product title..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="pl-9 text-xs bg-slate-50 border-slate-200 focus-visible:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Urgency tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              {[
                { id: "ALL", label: `All Alerts (${metrics.totalAlerts})` },
                { id: "OUT_OF_STOCK", label: `Out of Stock (${metrics.outOfStock})` },
                { id: "CRITICAL", label: `Critical (${metrics.critical})` },
                { id: "LOW", label: `Low Stock (${metrics.lowStock})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setFilterTab(tab.id);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    filterTab === tab.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadAlerts}
              disabled={isLoading}
              className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
              title="Refresh alerts"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 min-w-[120px]">Urgency</th>
                <th className="p-3.5 min-w-[240px]">Apparel Item</th>
                <th className="p-3.5 min-w-[160px]">SKU</th>
                <th className="p-3.5 text-right min-w-[100px]">Available</th>
                <th className="p-3.5 text-center min-w-[100px]">Safety Threshold</th>
                <th className="p-3.5 text-right min-w-[140px]">Suggested Reorder</th>
                <th className="p-3.5 min-w-[130px]">Warehouse</th>
                <th className="p-3.5 text-right w-28">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-xs">Loading safety threshold alerts...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          All warehouse SKUs are sufficiently stocked
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          No variants are currently below their minimum safety thresholds.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="text-xs"
                      >
                        <Link href="/inventory">View Inventory Grid</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const thresh = getCanonicalThreshold(item);
                  const urgency = getUrgencyLevel(item.available, thresh);
                  const isOutOfStock = urgency === "OUT_OF_STOCK";
                  const isCritical = urgency === "CRITICAL";

                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isOutOfStock ? "bg-rose-50/20" : isCritical ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Urgency Status */}
                      <td className="p-3.5">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                            OUT OF STOCK
                          </span>
                        ) : isCritical ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            CRITICAL
                          </span>
                        ) : urgency === "LOW_STOCK" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            IN STOCK
                          </span>
                        )}
                      </td>

                      {/* Product Profile */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative shrink-0">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.productTitle}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Boxes className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.productId}`}
                              className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline truncate block max-w-[200px]"
                            >
                              {item.productTitle}
                            </Link>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span
                                className="h-2 w-2 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: item.color?.hex || "#000" }}
                              />
                              <span>{item.color?.name}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-bold text-slate-700">Size {item.size}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400">{item.category}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {item.variantSku}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopySku(item.variantSku)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
                            title="Copy SKU"
                          >
                            {copiedSku === item.variantSku ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Available */}
                      <td className="p-3.5 text-right font-mono font-bold text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            isOutOfStock
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.available} units
                        </span>
                      </td>

                      {/* Threshold */}
                      <td className="p-3.5 text-center font-mono text-slate-600 text-xs">
                        {item.threshold} units
                      </td>

                      {/* Suggested Reorder */}
                      <td className="p-3.5 text-right font-mono font-semibold text-emerald-700 text-xs">
                        +{item.suggestedReorder} units
                      </td>

                      {/* Warehouse */}
                      <td className="p-3.5 text-slate-600 text-xs">
                        <span className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-slate-400" />
                          {item.warehouseLocation}
                        </span>
                      </td>

                      {/* Action: Quick Restock */}
                      <td className="p-3.5 text-right">
                        <Button
                          size="sm"
                          onClick={() => openQuickRestock(item)}
                          className="h-7 px-2.5 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                        >
                          <PlusCircle className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                          Restock
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {items.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-800">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-semibold text-slate-800">{pagination.total}</span> alert SKUs
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="h-8 px-2.5 text-xs border-slate-200 bg-white"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <span className="px-2 font-mono text-slate-700">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="h-8 px-2.5 text-xs border-slate-200 bg-white"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
        item={adjustmentItem}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
}
