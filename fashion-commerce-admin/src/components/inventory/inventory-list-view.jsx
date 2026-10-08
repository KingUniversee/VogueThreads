"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Boxes,
  Search,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Plus,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Eye,
  Warehouse,
  ArrowUpDown,
  Filter,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";
import { SkuDetailDrawer } from "./sku-detail-drawer";
import {
  getInventoryStatus,
  getCanonicalThreshold,
  isLowStock,
  isOutOfStock,
  isInStock,
} from "@/lib/inventory-status";

export function InventoryListView() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Selection
  const [selectedSkus, setSelectedSkus] = useState(new Set());

  // Dialogs & Drawers
  const [adjustmentItem, setAdjustmentItem] = useState(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Copy tracking
  const [copiedSku, setCopiedSku] = useState(null);

  // Fetch categories for filtering dropdown
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories?limit=100");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCategories(json.data);
        }
      } catch (err) {
        // Non-critical
      }
    }
    loadCategories();
  }, []);

  const loadInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search: search.trim(),
        status: statusFilter,
        sortBy,
        sortOrder,
        _t: String(Date.now()),
      });

      if (categoryFilter && categoryFilter !== "ALL") {
        params.append("categoryId", categoryFilter);
      }

      const res = await fetch(`/api/inventory?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      const json = await res.json();

      if (json.success) {
        setItems(json.data || []);
        if (json.pagination) setPagination(json.pagination);
        if (json.summary) setSummary(json.summary);
      }
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, categoryFilter, sortBy, sortOrder]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const handleCopySku = (sku) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
  };

  const toggleSelectAll = () => {
    if (selectedSkus.size === items.length) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(items.map((i) => i.variantSku)));
    }
  };

  const toggleSelectSku = (sku) => {
    const next = new Set(selectedSkus);
    if (next.has(sku)) next.delete(sku);
    else next.add(sku);
    setSelectedSkus(next);
  };

  const handleExportCsv = () => {
    window.open("/api/inventory/export", "_blank");
  };

  const handleAdjustmentSuccess = (updatedInv) => {
    if (updatedInv) {
      const thresh = getCanonicalThreshold(updatedInv);
      const newStatus = getInventoryStatus(updatedInv.available, thresh);

      setItems((prevItems) =>
        prevItems.map((item) =>
          item.variantSku === updatedInv.variantSku
            ? {
                ...item,
                onHand: updatedInv.onHand,
                reserved: updatedInv.reserved,
                available: updatedInv.available,
                lowStockThreshold: thresh,
                threshold: thresh,
                status: newStatus,
              }
            : item
        )
      );

      if (detailItem && detailItem.variantSku === updatedInv.variantSku) {
        setDetailItem({
          ...detailItem,
          onHand: updatedInv.onHand,
          reserved: updatedInv.reserved,
          available: updatedInv.available,
          lowStockThreshold: thresh,
          threshold: thresh,
          status: newStatus,
        });
      }
    }
    loadInventory();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Inventory Control
            </h1>
            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
              Color × Size SKUs
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time multi-variant warehouse stock tracking, double-entry ledger, and reserve allocations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs shadow-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs shadow-xs"
          >
            <Link href="/inventory/adjustments">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Adjustments Ledger
            </Link>
          </Button>

          <Button
            size="sm"
            asChild
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs shadow-xs"
          >
            <Link href="/inventory/low-stock">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Low Stock Alerts
              {summary?.lowStockCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-800 text-[10px] font-bold">
                  {summary.lowStockCount}
                </span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total SKUs
              </span>
              <Boxes className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {summary?.totalSkus ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tracked variants</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Physical On-Hand
              </span>
              <Warehouse className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-1">
              {summary?.totalOnHand?.toLocaleString("en-IN") ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total units in warehouse</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Available to Sell
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">
              {summary?.totalAvailable?.toLocaleString("en-IN") ?? 0}
            </p>
            <p className="text-[11px] text-emerald-600/70 mt-0.5">On-Hand − Reserved</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                Reserved
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-700 font-mono mt-1">
              {summary?.totalReserved?.toLocaleString("en-IN") ?? 0}
            </p>
            <p className="text-[11px] text-amber-600/70 mt-0.5">Customer order holds</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                Low Stock
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-700 font-mono mt-1">
              {summary?.lowStockCount ?? 0}
            </p>
            <p className="text-[11px] text-amber-600/70 mt-0.5">≤ Safety threshold</p>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Out of Stock
              </span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-bold text-rose-700 font-mono mt-1">
              {summary?.outOfStockCount ?? 0}
            </p>
            <p className="text-[11px] text-rose-600/70 mt-0.5">0 sellable units</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search SKU, apparel title, barcode, color, size..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="pl-9 text-xs bg-slate-50 border-slate-200 focus-visible:bg-white"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            {[
              { id: "ALL", label: "All SKUs" },
              { id: "IN_STOCK", label: "In Stock" },
              { id: "LOW_STOCK", label: "Low Stock" },
              { id: "OUT_OF_STOCK", label: "Out of Stock" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dropdown Filters & Controls */}
          <div className="flex items-center gap-2">
            {/* Category selector */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-8 text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Sort selector */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="h-8 text-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="available-asc">Lowest Available First</option>
              <option value="available-desc">Highest Available First</option>
              <option value="onHand-desc">Highest On-Hand</option>
              <option value="variantSku-asc">SKU (A to Z)</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadInventory}
              disabled={isLoading}
              className="h-8 w-8 p-0 border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs"
              title="Refresh inventory"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedSkus.size === items.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                </th>
                <th className="p-3.5 min-w-[240px]">Apparel Variant</th>
                <th className="p-3.5 min-w-[160px]">SKU / Barcode</th>
                <th className="p-3.5 min-w-[130px]">Warehouse</th>
                <th className="p-3.5 text-right">Physical On-Hand</th>
                <th className="p-3.5 text-right">Reserved</th>
                <th className="p-3.5 text-right">Available to Sell</th>
                <th className="p-3.5 text-center">Threshold</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right w-20">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-xs">Loading live warehouse inventory...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-16 text-center">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                        <Boxes className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {search || statusFilter !== "ALL" || categoryFilter !== "ALL"
                            ? "No matching variants found"
                            : "No inventory registered yet"}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {search || statusFilter !== "ALL" || categoryFilter !== "ALL"
                            ? "Try adjusting your search query, status filters, or category dropdown."
                            : "Create clothing products in the Catalog to automatically generate tracked variant SKUs."}
                        </p>
                      </div>
                      {search || statusFilter !== "ALL" || categoryFilter !== "ALL" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setStatusFilter("ALL");
                            setCategoryFilter("ALL");
                          }}
                          className="text-xs"
                        >
                          Clear Filters
                        </Button>
                      ) : (
                        <Button size="sm" asChild className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
                          <Link href="/products/new">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Create First Apparel Product
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isSelected = selectedSkus.has(item.variantSku);
                  const thresh = getCanonicalThreshold(item);
                  const itemOutOfStock = isOutOfStock(item.available);
                  const itemLowStock = isLowStock(item.available, thresh);

                  return (
                    <tr
                      key={item._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? "bg-slate-50" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSku(item.variantSku)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </td>

                      {/* Apparel Variant Profile */}
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
                            <button
                              type="button"
                              onClick={() => {
                                setDetailItem(item);
                                setIsDetailOpen(true);
                              }}
                              className="font-semibold text-slate-900 hover:text-indigo-600 hover:underline truncate block max-w-[220px] text-left text-xs"
                            >
                              {item.productTitle}
                            </button>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span
                                className="h-2 w-2 rounded-full border border-black/10 shrink-0"
                                style={{ backgroundColor: item.color?.hex || "#000" }}
                                title={item.color?.name}
                              />
                              <span className="font-medium text-slate-700">{item.color?.name}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-bold text-slate-800">Size {item.size}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400">{item.category}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU & Barcode */}
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
                        {item.barcode && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            UPC: {item.barcode}
                          </p>
                        )}
                      </td>

                      {/* Warehouse */}
                      <td className="p-3.5 text-slate-600 text-xs">
                        <span className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-slate-400" />
                          {item.warehouseLocation}
                        </span>
                      </td>

                      {/* On-Hand */}
                      <td className="p-3.5 text-right font-mono font-bold text-slate-800 text-xs">
                        {item.onHand}
                      </td>

                      {/* Reserved */}
                      <td className="p-3.5 text-right font-mono text-amber-700 font-semibold text-xs">
                        {item.reserved > 0 ? item.reserved : "—"}
                      </td>

                      {/* Available */}
                      <td className="p-3.5 text-right">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded-md text-xs ${
                            itemOutOfStock
                              ? "bg-rose-100 text-rose-800"
                              : itemLowStock
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {item.available}
                        </span>
                      </td>

                      {/* Threshold */}
                      <td className="p-3.5 text-center font-mono text-slate-500 text-xs">
                        {item.lowStockThreshold ?? item.threshold ?? 5}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {itemOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            OUT OF STOCK
                          </span>
                        ) : itemLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            IN STOCK
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-900"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem
                              onClick={() => {
                                setAdjustmentItem(item);
                                setIsAdjustmentOpen(true);
                              }}
                              className="cursor-pointer font-medium text-slate-900"
                            >
                              <Boxes className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                              Adjust Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setDetailItem(item);
                                setIsDetailOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 mr-2 text-slate-500" />
                              SKU Details & Ledger
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link href={`/inventory/adjustments?sku=${encodeURIComponent(item.variantSku)}`}>
                                <Clock className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                Adjustment History
                              </Link>
                            </DropdownMenuItem>
                            {item.productId && (
                              <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href={`/products/${item.productId}`}>
                                  <ExternalLink className="h-3.5 w-3.5 mr-2 text-slate-500" />
                                  View in Catalog
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
            of <span className="font-semibold text-slate-800">{pagination.total}</span> variants
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

      {/* Stock Adjustment Modal */}
      <StockAdjustmentDialog
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
        item={adjustmentItem}
        onSuccess={handleAdjustmentSuccess}
      />

      {/* SKU Detail Drawer */}
      <SkuDetailDrawer
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        item={detailItem}
        onAdjustClick={(it) => {
          setAdjustmentItem(it);
          setIsAdjustmentOpen(true);
        }}
        onThresholdUpdated={(sku, newThresh) => {
          setItems((prev) =>
            prev.map((i) => (i.variantSku === sku ? { ...i, lowStockThreshold: newThresh } : i))
          );
        }}
      />
    </div>
  );
}
