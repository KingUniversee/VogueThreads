"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Archive,
  Eye,
  Package,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
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

export function CollectionListView() {
  const router = useRouter();

  // Data states
  const [collections, setCollections] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, scheduled: 0, draft: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("recently_updated");
  const [currentPage, setCurrentPage] = useState(1);

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

  // Fetch collections from server-side paginated API
  const fetchCollections = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage("");

      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "10");
      params.set("sort", sortBy);
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (visibilityFilter !== "ALL") params.set("visibility", visibilityFilter);

      try {
        const res = await fetch(`/api/collections?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load collections");
        }

        setCollections(json.data || []);
        if (json.stats) setStats(json.stats);
        if (json.pagination) setPagination(json.pagination);
      } catch (err) {
        setErrorMessage(err.message || "Unable to fetch collections.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage, sortBy, debouncedSearch, statusFilter, typeFilter, visibilityFilter]
  );

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Auto-dismiss toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Toggle Active Visibility
  const handleToggleActive = async (collection) => {
    const nextVal = !collection.isActive;

    // Optimistic update
    setCollections((prev) =>
      prev.map((c) => (c._id === collection._id ? { ...c, isActive: nextVal } : c))
    );

    try {
      const res = await fetch(`/api/collections/${collection._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextVal }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update visibility");
      }
      setSuccessToast(`"${collection.name}" visibility updated to ${nextVal ? "Active" : "Inactive"}.`);
    } catch (err) {
      // Revert on error
      setCollections((prev) =>
        prev.map((c) => (c._id === collection._id ? { ...c, isActive: !nextVal } : c))
      );
      setErrorMessage(err.message || "Failed to update visibility.");
    }
  };

  // Duplicate Collection
  const handleDuplicate = async (collection) => {
    try {
      const res = await fetch(`/api/collections/${collection._id}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to duplicate collection");
      }
      setSuccessToast(`Duplicated collection as "${json.data.name}".`);
      fetchCollections(true);
    } catch (err) {
      setErrorMessage(err.message || "Duplication failed.");
    }
  };

  // Archive Collection
  const handleArchive = async (collection) => {
    try {
      const res = await fetch(`/api/collections/${collection._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED", isActive: false }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to archive collection");
      }
      setSuccessToast(`"${collection.name}" is now Archived.`);
      fetchCollections(true);
    } catch (err) {
      setErrorMessage(err.message || "Failed to archive collection.");
    }
  };

  // Execute Safe Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/collections/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete collection");
      }
      setSuccessToast(`Deleted collection "${deleteTarget.name}".`);
      setDeleteTarget(null);
      fetchCollections(true);
    } catch (err) {
      setErrorMessage(err.message || "Deletion failed.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isFiltering =
    Boolean(debouncedSearch) ||
    statusFilter !== "ALL" ||
    typeFilter !== "ALL" ||
    visibilityFilter !== "ALL";

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Collections</h1>
            <Badge variant="outline" className="font-mono text-xs">
              Merchandising OS
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Curate and organize products into focused merchandising collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCollections(true)}
            disabled={isRefreshing || isLoading}
            className="h-9 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            asChild
            className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
          >
            <Link href="/collections/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Collection
            </Link>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast("")}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-rose-600 hover:text-rose-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Stats Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Collections
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{stats.total}</span>
            <span className="text-[10px] text-slate-400">Total drops</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Active in Store
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-emerald-600">{stats.active}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Visible</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Scheduled Drops
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-indigo-600">{stats.scheduled}</span>
            <span className="text-[10px] text-indigo-500 font-medium">Upcoming</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Draft Collections
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-700">{stats.draft}</span>
            <span className="text-[10px] text-slate-400">In preparation</span>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filters Bar */}
      <Card className="bg-white border-slate-200 shadow-2xs p-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections by title or URL slug..."
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="MANUAL">Manual</option>
              <option value="RULE_BASED">Rule-based</option>
            </select>

            {/* Visibility Filter */}
            <select
              value={visibilityFilter}
              onChange={(e) => {
                setVisibilityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Visibility</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="name_asc">Name A → Z</option>
              <option value="name_desc">Name Z → A</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            {isFiltering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                  setVisibilityFilter("ALL");
                  setCurrentPage(1);
                }}
                className="h-9 px-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Collections Table */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Collection</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Products</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Visibility</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <p className="text-xs">Loading collections from MongoDB...</p>
                  </td>
                </tr>
              ) : collections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                      <Layers className="h-5 w-5" />
                    </div>
                    {isFiltering ? (
                      <>
                        <h4 className="text-xs font-semibold text-slate-700">No matching collections</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Try adjusting your search criteria or active filters.
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 className="text-xs font-semibold text-slate-700">No collections yet</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 mb-4">
                          Create your first merchandising collection to organize products for upcoming drops, edits, and campaigns.
                        </p>
                        <Button
                          size="sm"
                          asChild
                          className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          <Link href="/collections/new">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Create Collection
                          </Link>
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                collections.map((col) => {
                  const img = col.imageUrl || col.bannerUrl || "";
                  const updatedDate = col.updatedAt
                    ? new Date(col.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr key={col._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Collection Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-md border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={col.name} className="h-full w-full object-cover" />
                            ) : (
                              <Layers className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[240px]">
                            <Link
                              href={`/collections/${col._id}`}
                              className="font-bold text-slate-900 hover:underline truncate block text-xs"
                            >
                              {col.name}
                            </Link>
                            <span className="text-[11px] text-slate-400 font-mono block truncate">
                              /collections/{col.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        {col.type === "RULE_BASED" ? (
                          <Badge variant="info" className="text-[10px] font-medium gap-1 py-0.5">
                            <Sparkles className="h-3 w-3" />
                            Rule-based
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] font-medium gap-1 py-0.5">
                            <Layers className="h-3 w-3" />
                            Manual
                          </Badge>
                        )}
                      </td>

                      {/* Product Count Badge */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/collections/${col._id}`}
                          className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-700 hover:text-slate-900"
                        >
                          <Package className="h-3.5 w-3.5 text-slate-400" />
                          <span>{col.productCount || 0}</span>
                        </Link>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            col.status === "PUBLISHED"
                              ? "success"
                              : col.status === "SCHEDULED"
                              ? "info"
                              : col.status === "ARCHIVED"
                              ? "danger"
                              : "default"
                          }
                          className="text-[10px] font-mono uppercase"
                        >
                          {col.status}
                        </Badge>
                      </td>

                      {/* Visibility Switch */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={col.isActive}
                            onCheckedChange={() => handleToggleActive(col)}
                            className="scale-90"
                          />
                          <span className="text-[11px] font-mono text-slate-400">
                            {col.isActive ? (
                              <span className="text-emerald-600 font-medium">Active</span>
                            ) : (
                              <span>Inactive</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Updated Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {updatedDate}
                      </td>

                      {/* Actions Overflow Menu */}
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => router.push(`/collections/${col._id}`)}
                              className="text-xs cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 mr-2 text-slate-600" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/collections/${col._id}/edit`)}
                              className="text-xs cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-600" />
                              Edit Collection
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(col)}
                              className="text-xs cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                              Duplicate
                            </DropdownMenuItem>
                            {col.status !== "ARCHIVED" && (
                              <DropdownMenuItem
                                onClick={() => handleArchive(col)}
                                className="text-xs text-amber-600 focus:text-amber-600 cursor-pointer"
                              >
                                <Archive className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                Archive Drop
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(col)}
                              className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-600" />
                              Delete Collection
                            </DropdownMenuItem>
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

        {/* 5. Pagination Controls */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-xs text-slate-500 bg-slate-50">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} collections
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="h-8 px-2 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <span className="px-2 font-mono">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="h-8 px-2 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 6. Safe Delete Confirmation Dialog */}
      {deleteTarget && (
        <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="max-w-md bg-white p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Delete Collection: {deleteTarget.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete this collection?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5 my-2">
              <p className="font-semibold text-slate-800">Safe Deletion Guarantee:</p>
              <p className="text-[11px] text-slate-500">
                Deleting this collection will remove the collection entry and unlink it from any products.
                <strong> Associated products will NEVER be deleted.</strong>
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
