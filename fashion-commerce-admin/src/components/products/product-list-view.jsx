"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Eye,
  Copy,
  Archive,
  Trash2,
  RefreshCw,
  Download,
  AlertCircle,
  Shirt,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatINR, formatDate } from "@/lib/formatters";

const STATUS_TABS = [
  { id: "ALL", label: "All Products" },
  { id: "PUBLISHED", label: "Published" },
  { id: "DRAFT", label: "Draft" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "ARCHIVED", label: "Archived" },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Recently Updated" },
  { id: "newest", label: "Newest First" },
  { id: "oldest", label: "Oldest First" },
  { id: "name_asc", label: "Name: A → Z" },
  { id: "name_desc", label: "Name: Z → A" },
  { id: "price_asc", label: "Price: Low → High" },
  { id: "price_desc", label: "Price: High → Low" },
];

export function ProductListView() {
  const router = useRouter();

  // Query States
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedBrand, setSelectedBrand] = useState("ALL");
  const [selectedStockStatus, setSelectedStockStatus] = useState("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedSort, setSelectedSort] = useState("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Data States
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Available Filter Registries
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Bulk Selection States
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Debounce search query (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load Categories and Brands for dropdown filters
  useEffect(() => {
    async function loadFiltersData() {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/brands"),
        ]);
        if (catRes.ok) {
          const catJson = await catRes.json();
          setCategories(catJson.data || []);
        }
        if (brandRes.ok) {
          const brandJson = await brandRes.json();
          setBrands(brandJson.data || []);
        }
      } catch (err) {
        console.warn("Error loading filter dropdowns:", err);
      }
    }
    loadFiltersData();
  }, []);

  // Fetch Products from MongoDB API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));
      params.set("sort", selectedSort);

      if (activeTab !== "ALL") params.set("status", activeTab);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (selectedBrand !== "ALL") params.set("brand", selectedBrand);
      if (selectedStockStatus !== "ALL") params.set("stockStatus", selectedStockStatus);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);

      const res = await fetch(`/api/products?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Failed to load products (HTTP ${res.status})`);
      }

      const json = await res.json();
      if (json.success) {
        setProducts(json.data || []);
        setPagination(json.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 });
      } else {
        throw new Error(json.error || "Failed to load products");
      }
    } catch (err) {
      console.error("Products fetch error:", err);
      setError(err.message || "Unable to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    selectedSort,
    activeTab,
    debouncedSearch,
    selectedCategory,
    selectedBrand,
    selectedStockStatus,
    minPrice,
    maxPrice,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Bulk Selection Helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Bulk Operation Handler
  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    const confirmMsg =
      action === "DELETE"
        ? `Are you sure you want to delete/archive ${selectedIds.size} selected products?`
        : `Apply ${action.toLowerCase()} to ${selectedIds.size} selected products?`;

    if (!window.confirm(confirmMsg)) return;

    setIsBulkOperating(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids: Array.from(selectedIds),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Bulk action failed");
      }
      setSelectedIds(new Set());
      fetchProducts();
    } catch (err) {
      alert(err.message || "Bulk operation failed");
    } finally {
      setIsBulkOperating(false);
    }
  };

  // Single Action: Duplicate Product
  const handleDuplicate = async (productId) => {
    try {
      const res = await fetch(`/api/products/${productId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to duplicate product");
      }
      fetchProducts();
    } catch (err) {
      alert(err.message || "Could not duplicate product");
    }
  };

  // Single Action: Safe Delete/Archive
  const handleDelete = async (productId, title) => {
    if (!window.confirm(`Are you sure you want to delete or archive '${title}'?`)) return;

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete product");
      }
      fetchProducts();
    } catch (err) {
      alert(err.message || "Could not delete product");
    }
  };

  // Reset Filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setActiveTab("ALL");
    setSelectedCategory("ALL");
    setSelectedBrand("ALL");
    setSelectedStockStatus("ALL");
    setMinPrice("");
    setMaxPrice("");
    setSelectedSort("recent");
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const hasActiveFilters =
    debouncedSearch ||
    activeTab !== "ALL" ||
    selectedCategory !== "ALL" ||
    selectedBrand !== "ALL" ||
    selectedStockStatus !== "ALL" ||
    minPrice ||
    maxPrice;

  return (
    <div className="space-y-6 antialiased pb-12 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HEADER: CONTEXTUAL TITLE, SUBTITLE & CREATE ACTION                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Products
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {pagination.total} styles
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Manage your VogueThreads catalog, products, variants and merchandising data.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/api/products/export", "_blank")}
            className="h-9 px-3 text-xs text-slate-700"
            title="Export catalog to CSV"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={isLoading}
            className="h-9 px-3 text-xs text-slate-700"
            title="Refresh product listing"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            <span className="hidden sm:inline ml-1.5">Refresh</span>
          </Button>

          <Button
            size="sm"
            asChild
            className="h-9 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-subtle flex items-center gap-1.5"
          >
            <Link href="/products/new">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Product</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchProducts}
            className="h-7 text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STATUS TABS & SEARCH / FILTER CONTROLS BAR                             */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-subtle p-3 sm:p-4 space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 pb-2 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white font-semibold shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter Inputs Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
          {/* Debounced Search */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Title, SKU, or Slug..."
              className="h-9 pl-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Category Dropdown Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Dropdown Filter */}
          <div>
            <select
              value={selectedBrand}
              onChange={(e) => {
                setSelectedBrand(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Brands</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Dropdown Filter */}
          <div>
            <select
              value={selectedStockStatus}
              onChange={(e) => {
                setSelectedStockStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div>
            <select
              value={selectedSort}
              onChange={(e) => {
                setSelectedSort(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:bg-white cursor-pointer font-medium"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button (Visible when filters applied) */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Filtered results: <strong className="text-slate-900">{pagination.total}</strong> products found
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. FLOATING BULK ACTIONS TOOLBAR (When rows are checked)                  */}
      {/* ========================================================================= */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-dropdown flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in-50">
          <div className="flex items-center gap-2 text-xs">
            <span className="h-5 w-5 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-[10px]">
              {selectedIds.size}
            </span>
            <span>products selected for bulk action</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkOperating}
              onClick={() => handleBulkAction("PUBLISH")}
              className="h-8 text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
            >
              Publish
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkOperating}
              onClick={() => handleBulkAction("UNPUBLISH")}
              className="h-8 text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
            >
              Unpublish (Draft)
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isBulkOperating}
              onClick={() => handleBulkAction("ARCHIVE")}
              className="h-8 text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
            >
              Archive
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={isBulkOperating}
              onClick={() => handleBulkAction("DELETE")}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white border-none"
            >
              Delete / Soft Archive
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRODUCTS DATA TABLE / EMPTY STATE                                      */}
      {/* ========================================================================= */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Querying product catalog from MongoDB...</p>
            </div>
          ) : products.length === 0 ? (
            /* POLISHED EMPTY STATE (No fake products) */
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Shirt className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900">
                  {hasActiveFilters ? "No products match your filter criteria" : "No products yet"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {hasActiveFilters
                    ? "Try adjusting search terms, categories, or clearing applied filters."
                    : "Start building your VogueThreads catalog with apparel styles and Color × Size variants."}
                </p>
              </div>

              <div className="pt-2">
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters} className="text-xs">
                    Clear Filters
                  </Button>
                ) : (
                  <Button size="sm" asChild className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
                    <Link href="/products/new">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      <span>Create Product</span>
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold text-left">
                    <th className="p-3 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        aria-label="Select all products"
                      />
                    </th>
                    <th className="p-3">Product</th>
                    <th className="p-3">Base SKU</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Brand</th>
                    <th className="p-3">Variants</th>
                    <th className="p-3">Price</th>
                    <th className="p-3 text-center">Stock Status</th>
                    <th className="p-3 text-center">Catalog Status</th>
                    <th className="p-3">Updated</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const isChecked = selectedIds.has(p.id);
                    const statusVariant =
                      {
                        PUBLISHED: "success",
                        DRAFT: "default",
                        SCHEDULED: "info",
                        ARCHIVED: "danger",
                      }[p.status] || "default";

                    const stockVariant =
                      {
                        IN_STOCK: "success",
                        LOW_STOCK: "warning",
                        OUT_OF_STOCK: "danger",
                      }[p.stock.status] || "default";

                    const stockLabel =
                      {
                        IN_STOCK: "In Stock",
                        LOW_STOCK: "Low Stock",
                        OUT_OF_STOCK: "Out of Stock",
                      }[p.stock.status] || "Unknown";

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isChecked ? "bg-slate-50" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRow(p.id)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            aria-label={`Select ${p.title}`}
                          />
                        </td>

                        {/* Product Thumbnail & Title */}
                        <td className="p-3">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className="h-10 w-10 rounded bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
                              {p.primaryImage ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={p.primaryImage}
                                  alt={p.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Shirt className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/products/${p.id}`}
                                className="font-semibold text-slate-900 hover:text-indigo-600 truncate block hover:underline"
                              >
                                {p.title}
                              </Link>
                              <span className="text-[10px] font-mono text-slate-400 block truncate">
                                /{p.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="p-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                          {p.baseSku}
                        </td>

                        {/* Category */}
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {p.category?.name ? (
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {p.category.name}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Brand */}
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {p.brand?.name || "—"}
                        </td>

                        {/* Variants Count & Overview */}
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 font-mono">
                            {p.variantsCount}
                          </span>{" "}
                          <span className="text-[10px] text-slate-400">
                            ({p.colorsCount}C / {p.sizesCount}S)
                          </span>
                        </td>

                        {/* Price */}
                        <td className="p-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {formatINR(p.priceMin, false)}
                        </td>

                        {/* Stock Status */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <Badge variant={stockVariant} className="text-[10px] font-medium">
                            {stockLabel}
                          </Badge>
                        </td>

                        {/* Catalog Status */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <Badge variant={statusVariant} className="text-[10px] font-mono font-bold uppercase">
                            {p.status}
                          </Badge>
                        </td>

                        {/* Updated Date */}
                        <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {formatDate(p.updatedAt, { shortMonth: true })}
                        </td>

                        {/* Actions Menu */}
                        <td className="p-3 text-right whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36 text-xs">
                              <DropdownMenuItem asChild>
                                <Link href={`/products/${p.id}`} className="cursor-pointer">
                                  <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/products/${p.id}/edit`} className="cursor-pointer">
                                  <Edit className="h-3.5 w-3.5 mr-2" /> Edit Style
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(p.id)}
                                className="cursor-pointer"
                              >
                                <Copy className="h-3.5 w-3.5 mr-2" /> Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(p.id, p.title)}
                                className="text-rose-600 cursor-pointer focus:text-rose-700"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Archive / Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* ========================================================================= */}
        {/* 5. SERVER-SIDE PAGINATION BAR                                             */}
        {/* ========================================================================= */}
        {!isLoading && products.length > 0 && (
          <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50">
            <div>
              Showing{" "}
              <strong className="font-semibold text-slate-900">
                {(pagination.page - 1) * pagination.limit + 1}
              </strong>{" "}
              to{" "}
              <strong className="font-semibold text-slate-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{" "}
              of <strong className="font-semibold text-slate-900">{pagination.total}</strong> products
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                <span>Previous</span>
              </Button>

              <span className="px-2 font-mono text-xs">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-2.5 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
