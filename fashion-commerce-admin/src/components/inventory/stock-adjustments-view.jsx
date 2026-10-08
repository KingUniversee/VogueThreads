"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  Search,
  RefreshCw,
  Plus,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileText,
  User,
  RotateCcw,
  CheckCircle2,
  MinusCircle,
  ClipboardCheck,
  AlertCircle,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

export function StockAdjustmentsView() {
  const searchParams = useSearchParams();
  const initialSku = searchParams.get("sku") || "";

  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalUnitsAdded: 0,
    totalUnitsDeducted: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [skuFilter, setSkuFilter] = useState(initialSku);
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Adjustment dialog state
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentItem, setAdjustmentItem] = useState(null);

  const loadAdjustments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search: search.trim(),
        sku: skuFilter.trim(),
        type: typeFilter,
      });

      const res = await fetch(`/api/inventory/adjustments?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setItems(json.data || []);
        if (json.pagination) setPagination(json.pagination);
        if (json.stats) setStats(json.stats);
      }
    } catch (err) {
      console.error("Failed to fetch adjustments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, skuFilter, typeFilter]);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  const getTypeBadge = (type) => {
    switch (type) {
      case "RESTOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Plus className="h-3 w-3 text-emerald-500" />
            Restock
          </span>
        );
      case "DAMAGE_WRITE_OFF":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <MinusCircle className="h-3 w-3 text-rose-500" />
            Damage Write-Off
          </span>
        );
      case "PHYSICAL_AUDIT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <ClipboardCheck className="h-3 w-3 text-amber-500" />
            Physical Audit
          </span>
        );
      case "RETURN_RESTOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw className="h-3 w-3 text-purple-500" />
            Return Restock
          </span>
        );
      case "SHRINKAGE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="h-3 w-3 text-red-500" />
            Shrinkage Loss
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText className="h-3 w-3 text-slate-500" />
            {type?.replace(/_/g, " ")}
          </span>
        );
    }
  };

  const netDelta = (stats?.totalUnitsAdded ?? 0) - (stats?.totalUnitsDeducted ?? 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Stock Adjustments Ledger
            </h1>
            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
              Immutable
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Double-entry audit log of all physical count reconciliations, inbound restocks, and damage write-offs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild className="text-xs border-slate-200">
            <Link href="/inventory">
              <Boxes className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Inventory Grid
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              // Open modal with quick SKU lookup
              setAdjustmentItem({
                variantSku: skuFilter || "VT-SELECT-SKU",
                productTitle: "Manual Stock Ledger Entry",
                onHand: 0,
                reserved: 0,
                available: 0,
                color: { name: "Universal" },
                size: "Standard",
              });
              setIsAdjustmentOpen(true);
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
            Record Adjustment
          </Button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Ledger Entries
              </span>
              <FileText className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {stats?.totalTransactions ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Historical transactions</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Units Restocked
              </span>
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">
              +{(stats?.totalUnitsAdded ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-emerald-600/70 mt-0.5">Inbound shipments</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Units Deducted
              </span>
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-rose-700 font-mono mt-1">
              -{(stats?.totalUnitsDeducted ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-rose-600/70 mt-0.5">Damage / audit write-offs</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Net Stock Change
              </span>
              <Boxes className="h-4 w-4 text-slate-400" />
            </div>
            <p
              className={`text-2xl font-bold font-mono mt-1 ${
                netDelta >= 0 ? "text-slate-900" : "text-rose-700"
              }`}
            >
              {netDelta >= 0 ? `+${netDelta}` : netDelta}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Net inventory impact</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search SKU, reason, reference ID, admin actor..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="pl-9 text-xs bg-slate-50 border-slate-200 focus-visible:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* SKU filter pill */}
            {skuFilter && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 font-mono">
                <span>SKU: {skuFilter}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSkuFilter("");
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="hover:text-indigo-900"
                >
                  ×
                </button>
              </div>
            )}

            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-8 text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">All Adjustment Types</option>
              <option value="RESTOCK">Restock</option>
              <option value="DAMAGE_WRITE_OFF">Damage Write-Off</option>
              <option value="PHYSICAL_AUDIT">Physical Audit</option>
              <option value="RETURN_RESTOCK">Return Restock</option>
              <option value="SHRINKAGE">Shrinkage</option>
              <option value="MANUAL_ADJUSTMENT">Manual Correction</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadAdjustments}
              disabled={isLoading}
              className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
              title="Refresh ledger"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 min-w-[150px]">Date / Time</th>
                <th className="p-3.5 min-w-[140px]">Reference ID</th>
                <th className="p-3.5 min-w-[220px]">Variant SKU & Apparel</th>
                <th className="p-3.5 min-w-[130px]">Type</th>
                <th className="p-3.5 text-right min-w-[90px]">Delta Units</th>
                <th className="p-3.5 text-center min-w-[140px]">Stock Movement</th>
                <th className="p-3.5 min-w-[220px]">Reason & Notes</th>
                <th className="p-3.5 min-w-[150px]">Performed By</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-xs">Loading transaction ledger...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          No transactions recorded yet
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Stock ledger entries are recorded permanently whenever physical stock is restocked, deducted, or audited.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="text-xs"
                      >
                        <Link href="/inventory">Go to Inventory Grid</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((tx) => {
                  const isPositive = (tx.delta ?? 0) > 0;
                  return (
                    <tr key={tx._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Date & Time */}
                      <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString("en-IN") : "—"}
                      </td>

                      {/* Reference ID */}
                      <td className="p-3.5">
                        <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {tx.referenceId}
                        </span>
                      </td>

                      {/* Variant SKU & Apparel */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden relative shrink-0">
                            {tx.image ? (
                              <Image
                                src={tx.image}
                                alt={tx.productTitle}
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
                            <span className="font-mono font-bold text-slate-900 text-xs block truncate">
                              {tx.variantSku}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block max-w-[180px]">
                              {tx.productTitle} ({tx.variantColor?.name} / {tx.variantSize})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="p-3.5">{getTypeBadge(tx.type)}</td>

                      {/* Delta Units */}
                      <td className="p-3.5 text-right">
                        <span
                          className={`font-mono font-bold text-xs inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {isPositive ? `+${tx.delta}` : tx.delta}
                        </span>
                      </td>

                      {/* Movement (Previous -> New Available) */}
                      <td className="p-3.5 text-center font-mono text-xs">
                        <span className="text-slate-400">{tx.previousAvailable}</span>
                        <span className="mx-1.5 text-slate-300">→</span>
                        <span className="font-bold text-slate-900">{tx.newAvailable}</span>
                        <span className="text-[10px] text-slate-400 ml-1">avail</span>
                      </td>

                      {/* Reason & Notes */}
                      <td className="p-3.5">
                        <p className="font-medium text-slate-800 text-xs max-w-xs truncate">
                          {tx.reason}
                        </p>
                        {tx.notes && (
                          <p className="text-[11px] text-slate-400 italic max-w-xs truncate mt-0.5">
                            {tx.notes}
                          </p>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                          <span className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 text-[10px] font-bold">
                            {tx.actorEmail ? tx.actorEmail[0].toUpperCase() : "A"}
                          </span>
                          <span className="truncate max-w-[130px] font-mono">{tx.actorEmail}</span>
                        </div>
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
            of <span className="font-semibold text-slate-800">{pagination.total}</span> entries
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
        onSuccess={() => loadAdjustments()}
      />
    </div>
  );
}
