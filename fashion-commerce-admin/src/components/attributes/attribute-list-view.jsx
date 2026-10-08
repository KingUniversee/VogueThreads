"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Package,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  ShieldAlert,
  X,
  Palette,
  CheckSquare,
  ListFilter,
  FileText,
  Hash,
  ToggleLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Helper for attribute type visual styling
export function getAttributeTypeBadge(type) {
  switch (type) {
    case "SELECT":
      return {
        label: "Select",
        icon: ListFilter,
        className: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    case "MULTISELECT":
      return {
        label: "Multi Select",
        icon: CheckSquare,
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "COLOR":
      return {
        label: "Color Swatch",
        icon: Palette,
        className: "bg-pink-50 text-pink-700 border-pink-200",
      };
    case "TEXT":
      return {
        label: "Free Text",
        icon: FileText,
        className: "bg-sky-50 text-sky-700 border-sky-200",
      };
    case "NUMBER":
      return {
        label: "Number",
        icon: Hash,
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "BOOLEAN":
      return {
        label: "Boolean",
        icon: ToggleLeft,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    default:
      return {
        label: type,
        icon: SlidersHorizontal,
        className: "bg-slate-100 text-slate-700 border-slate-200",
      };
  }
}

export function AttributeListView() {
  const router = useRouter();

  // Data states
  const [attributes, setAttributes] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, typesCount: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("sort_order");
  const [currentPage, setCurrentPage] = useState(1);

  // Status toggle state
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Copy slug state
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch attributes from server-side paginated API
  const fetchAttributes = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage("");

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "10");
      params.set("sort", sortBy);
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      try {
        const res = await fetch(`/api/attributes?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load attributes");
        }

        setAttributes(json.data || []);
        if (json.stats) setStats(json.stats);
        if (json.pagination) setPagination(json.pagination);
      } catch (err) {
        setErrorMessage(err.message || "Unable to fetch attributes.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage, sortBy, debouncedSearch, typeFilter, statusFilter]
  );

  useEffect(() => {
    fetchAttributes();
  }, [fetchAttributes]);

  // Quick Toggle Active Status
  const handleToggleStatus = async (attr) => {
    const newStatus = !attr.isActive;
    setUpdatingStatusId(attr._id);

    // Optimistic update
    setAttributes((prev) =>
      prev.map((a) => (a._id === attr._id ? { ...a, isActive: newStatus } : a))
    );

    try {
      const res = await fetch(`/api/attributes/${attr._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update attribute status");
      }

      setSuccessToast(`Attribute "${attr.name}" set to ${newStatus ? "Active" : "Inactive"}.`);
      setTimeout(() => setSuccessToast(""), 3500);
      fetchAttributes(true);
    } catch (err) {
      // Revert optimistic update
      setAttributes((prev) =>
        prev.map((a) => (a._id === attr._id ? { ...a, isActive: attr.isActive } : a))
      );
      setErrorMessage(err.message || "Status update failed.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Copy Code
  const handleCopyCode = (attr) => {
    navigator.clipboard.writeText(attr.code);
    setCopiedCodeId(attr._id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Safe Deletion Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.productCount > 0) {
      setErrorMessage(
        `Cannot delete attribute "${deleteTarget.name}". It is assigned to ${deleteTarget.productCount} active product(s).`
      );
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/attributes/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete attribute");
      }

      setSuccessToast(`Attribute "${deleteTarget.name}" deleted successfully.`);
      setTimeout(() => setSuccessToast(""), 4000);
      setDeleteTarget(null);
      fetchAttributes(true);
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete attribute.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Sum total products linked across all loaded attributes
  const totalAssignedProducts = attributes.reduce((acc, a) => acc + (a.productCount || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-950 text-emerald-100 rounded-lg shadow-xl border border-emerald-800/80 animate-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast("")}
            className="ml-2 text-emerald-400 hover:text-emerald-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-rose-500 hover:text-rose-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Fashion Attributes & Taxonomy
              </h1>
              <p className="text-xs text-slate-500">
                Configure reusable garment specifications: Fabric, Fit, Sleeve, Neck, Occasion, and Color swatches.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAttributes(true)}
            disabled={isLoading || isRefreshing}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50 text-slate-700"
            title="Refresh attributes list"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin text-slate-500" : ""}`}
            />
            Refresh
          </Button>

          <Button
            size="sm"
            asChild
            className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
          >
            <Link href="/attributes/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Attribute
            </Link>
          </Button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Total Attributes
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">
                Active Attributes
              </p>
              <h3 className="text-xl font-bold text-emerald-700 mt-0.5">{stats.active}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">
                Inactive Attributes
              </p>
              <h3 className="text-xl font-bold text-amber-700 mt-0.5">{stats.inactive}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-indigo-600 uppercase tracking-wider">
                Products Linked
              </p>
              <h3 className="text-xl font-bold text-indigo-700 mt-0.5">{totalAssignedProducts}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search attributes by name or key..."
            className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
          >
            <option value="ALL">All Types</option>
            <option value="SELECT">Select (Single)</option>
            <option value="MULTISELECT">Multi Select</option>
            <option value="COLOR">Color Swatch</option>
            <option value="TEXT">Free Text</option>
            <option value="NUMBER">Number</option>
            <option value="BOOLEAN">Boolean (Yes/No)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-1 focus:ring-slate-900 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 h-9">
            <ArrowUpDown className="h-3 w-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-transparent border-none text-slate-700 font-medium focus:outline-hidden pr-2"
            >
              <option value="sort_order">Sort Order</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="recently_updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ATTRIBUTES TABLE / EMPTY STATE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center">
            <RefreshCw className="h-7 w-7 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading fashion attributes...</p>
          </div>
        ) : attributes.length === 0 ? (
          <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <SlidersHorizontal className="h-7 w-7 stroke-1" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL"
                  ? "No matching attributes found"
                  : "No attributes defined yet"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try adjusting your search criteria or filter options to locate the attribute."
                  : "Define technical specifications like Fabric, Fit, Sleeve, Neckline, and Pattern to enrich your apparel catalog."}
              </p>
            </div>
            {searchQuery || typeFilter !== "ALL" || statusFilter !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="text-xs h-8"
              >
                Clear Filters
              </Button>
            ) : (
              <Button
                size="sm"
                asChild
                className="text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Link href="/attributes/new">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Register First Attribute
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Attribute Name</th>
                  <th className="py-3 px-4">Key / Slug</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Values / Options</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {attributes.map((attr) => {
                  const typeBadge = getAttributeTypeBadge(attr.type);
                  const TypeIcon = typeBadge.icon;

                  return (
                    <tr
                      key={attr._id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Attribute Name & Description */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <Link
                            href={`/attributes/${attr._id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block truncate"
                          >
                            {attr.name}
                          </Link>
                          {attr.description ? (
                            <p className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                              {attr.description}
                            </p>
                          ) : (
                            <span className="text-[11px] text-slate-300 italic">No description</span>
                          )}
                        </div>
                      </td>

                      {/* URL Slug / Code */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700">
                          <span>{attr.code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(attr)}
                            className="text-slate-400 hover:text-slate-700 transition-colors"
                            title="Copy code"
                          >
                            {copiedCodeId === attr._id ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium gap-1 ${typeBadge.className}`}
                        >
                          <TypeIcon className="h-3 w-3 shrink-0" />
                          {typeBadge.label}
                        </Badge>
                      </td>

                      {/* Values / Options Preview */}
                      <td className="py-3 px-4">
                        {["SELECT", "MULTISELECT", "COLOR"].includes(attr.type) ? (
                          attr.options?.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1 max-w-xs">
                              {attr.options.slice(0, 3).map((opt, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-medium text-slate-700"
                                >
                                  {opt.hex && (
                                    <span
                                      className="h-2 w-2 rounded-full border border-slate-300"
                                      style={{ backgroundColor: opt.hex }}
                                    />
                                  )}
                                  {opt.label}
                                </span>
                              ))}
                              {attr.options.length > 3 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  +{attr.options.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 font-medium">
                              0 options configured
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {attr.type === "TEXT"
                              ? "Free text input"
                              : attr.type === "NUMBER"
                              ? "Numeric specification"
                              : "Yes / No toggle"}
                          </span>
                        )}
                      </td>

                      {/* Linked Products Count */}
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium ${
                            attr.productCount > 0
                              ? "bg-indigo-50/70 border-indigo-200 text-indigo-800"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {attr.productCount} {attr.productCount === 1 ? "product" : "products"}
                        </Badge>
                      </td>

                      {/* Status with Quick Toggle Switch */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={attr.isActive}
                            disabled={updatingStatusId === attr._id}
                            onCheckedChange={() => handleToggleStatus(attr)}
                            className="scale-85 origin-left"
                          />
                          <span
                            className={`text-[11px] font-medium ${
                              attr.isActive ? "text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {attr.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>

                      {/* Actions Dropdown */}
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/attributes/${attr._id}`}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-500" />
                                View Details
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link
                                href={`/attributes/${attr._id}/edit`}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                Edit Attribute
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleCopyCode(attr)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5 text-slate-500" />
                              Copy Code
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(attr)}
                              className="flex items-center gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete Attribute
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

        {/* PAGINATION */}
        {!isLoading && attributes.length > 0 && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t border-slate-200 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Showing page <strong className="text-slate-800">{pagination.page}</strong> of{" "}
              <strong className="text-slate-800">{pagination.totalPages}</strong> (
              {pagination.total} total attributes)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs border-slate-200"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 text-xs border-slate-200"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SAFE DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center ${
                  deleteTarget?.productCount > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {deleteTarget?.productCount > 0 ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {deleteTarget?.productCount > 0 ? "Cannot Delete Attribute" : "Delete Attribute"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {deleteTarget?.name} ({deleteTarget?.code})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            {deleteTarget?.productCount > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Active Attribute Reference
                </div>
                <p>
                  This attribute is currently linked to{" "}
                  <strong>
                    {deleteTarget.productCount}{" "}
                    {deleteTarget.productCount === 1 ? "product" : "products"}
                  </strong>
                  .
                </p>
                <p className="text-[11px] text-amber-700">
                  To prevent breaking technical apparel specifications on active products, please
                  reassign or remove this attribute from those products before attempting deletion.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900">&ldquo;{deleteTarget?.name}&rdquo;</strong>?
                This will remove the attribute definition and all its configured values. This action
                cannot be undone.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="text-xs h-8 border-slate-200"
            >
              Cancel
            </Button>
            {deleteTarget?.productCount > 0 ? (
              <Button
                size="sm"
                disabled
                className="text-xs h-8 bg-slate-300 text-slate-500 cursor-not-allowed"
              >
                Deletion Blocked
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
