"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Tag,
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
  ExternalLink,
  Globe,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Check,
  ShieldAlert,
  X,
  Building2,
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

export function BrandListView() {
  const router = useRouter();

  // Data states
  const [brands, setBrands] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("recently_updated");
  const [currentPage, setCurrentPage] = useState(1);

  // Status toggle in-flight state
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Copy slug state
  const [copiedSlugId, setCopiedSlugId] = useState(null);

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

  // Fetch brands from server-side paginated API
  const fetchBrands = useCallback(
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

      try {
        const res = await fetch(`/api/brands?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load brands");
        }

        setBrands(json.data || []);
        if (json.stats) setStats(json.stats);
        if (json.pagination) setPagination(json.pagination);
      } catch (err) {
        setErrorMessage(err.message || "Unable to fetch brands.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage, sortBy, debouncedSearch, statusFilter]
  );

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Quick Toggle Active Status
  const handleToggleStatus = async (brand) => {
    const newStatus = !brand.isActive;
    setUpdatingStatusId(brand._id);

    // Optimistic update
    setBrands((prev) =>
      prev.map((b) => (b._id === brand._id ? { ...b, isActive: newStatus } : b))
    );

    try {
      const res = await fetch(`/api/brands/${brand._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update brand status");
      }

      setSuccessToast(`Brand "${brand.name}" set to ${newStatus ? "Active" : "Inactive"}.`);
      setTimeout(() => setSuccessToast(""), 3500);
      fetchBrands(true);
    } catch (err) {
      // Revert optimistic update
      setBrands((prev) =>
        prev.map((b) => (b._id === brand._id ? { ...b, isActive: brand.isActive } : b))
      );
      setErrorMessage(err.message || "Status update failed.");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Copy Slug
  const handleCopySlug = (brand) => {
    navigator.clipboard.writeText(brand.slug);
    setCopiedSlugId(brand._id);
    setTimeout(() => setCopiedSlugId(null), 2000);
  };

  // Safe Deletion Confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.productCount > 0) {
      setErrorMessage(
        `Cannot delete brand "${deleteTarget.name}". It is assigned to ${deleteTarget.productCount} active product(s).`
      );
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/brands/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete brand");
      }

      setSuccessToast(`Brand "${deleteTarget.name}" deleted successfully.`);
      setTimeout(() => setSuccessToast(""), 4000);
      setDeleteTarget(null);
      fetchBrands(true);
    } catch (err) {
      setErrorMessage(err.message || "Failed to delete brand.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Sum total products assigned across all loaded brands for summary stat
  const totalAssignedProducts = brands.reduce((acc, b) => acc + (b.productCount || 0), 0);

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
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Brands & Designers
              </h1>
              <p className="text-xs text-slate-500">
                Manage luxury fashion houses, independent designer labels, and brand registries.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBrands(true)}
            disabled={isLoading || isRefreshing}
            className="h-9 text-xs border-slate-200 hover:bg-slate-50 text-slate-700"
            title="Refresh brand list"
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
            <Link href="/brands/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Brand
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
                Total Brands
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Building2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">
                Active Brands
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
                Inactive Brands
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
              <h3 className="text-xl font-bold text-indigo-700 mt-0.5">
                {totalAssignedProducts}
              </h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brands by name or slug..."
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
              <option value="recently_updated">Recently Updated</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* BRAND TABLE / EMPTY STATE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center">
            <RefreshCw className="h-7 w-7 animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading brands registry...</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Tag className="h-7 w-7 stroke-1" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {searchQuery || statusFilter !== "ALL"
                  ? "No matching brands found"
                  : "No brands registered yet"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try adjusting your search criteria or filter options to locate the brand."
                  : "Start curating your apparel catalog by registering luxury designer labels and fashion brands."}
              </p>
            </div>
            {searchQuery || statusFilter !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
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
                <Link href="/brands/new">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Register First Brand
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Brand Label</th>
                  <th className="py-3 px-4">URL Slug</th>
                  <th className="py-3 px-4">Products</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {brands.map((brand) => (
                  <tr
                    key={brand._id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Brand Label & Logo */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          {brand.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={brand.logoUrl}
                              alt={brand.name}
                              className="h-full w-full object-contain p-1"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <span
                            className={`font-bold text-xs text-slate-600 uppercase ${
                              brand.logoUrl ? "hidden" : "flex"
                            }`}
                          >
                            {brand.name.slice(0, 2)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <Link
                            href={`/brands/${brand._id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors block truncate"
                          >
                            {brand.name}
                          </Link>
                          {brand.website ? (
                            <a
                              href={
                                brand.website.startsWith("http")
                                  ? brand.website
                                  : `https://${brand.website}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 truncate max-w-[200px]"
                            >
                              <Globe className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{brand.website.replace(/^https?:\/\//, "")}</span>
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No website</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* URL Slug */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700">
                        <span>/{brand.slug}</span>
                        <button
                          type="button"
                          onClick={() => handleCopySlug(brand)}
                          className="text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copy slug"
                        >
                          {copiedSlugId === brand._id ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Linked Products Count */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium ${
                            brand.productCount > 0
                              ? "bg-indigo-50/70 border-indigo-200 text-indigo-800"
                              : "bg-slate-50 border-slate-200 text-slate-500"
                          }`}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          {brand.productCount} {brand.productCount === 1 ? "product" : "products"}
                        </Badge>
                      </div>
                    </td>

                    {/* Status with Quick Toggle Switch */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={brand.isActive}
                          disabled={updatingStatusId === brand._id}
                          onCheckedChange={() => handleToggleStatus(brand)}
                          className="scale-85 origin-left"
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            brand.isActive ? "text-emerald-700" : "text-slate-400"
                          }`}
                        >
                          {brand.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>

                    {/* Updated At */}
                    <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(brand.updatedAt || brand.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
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
                              href={`/brands/${brand._id}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              View Details
                            </Link>
                          </DropdownMenuItem>

                          <DropdownMenuItem asChild>
                            <Link
                              href={`/brands/${brand._id}/edit`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                              Edit Brand
                            </Link>
                          </DropdownMenuItem>

                          {brand.website && (
                            <DropdownMenuItem asChild>
                              <a
                                href={
                                  brand.website.startsWith("http")
                                    ? brand.website
                                    : `https://${brand.website}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                Visit Website
                              </a>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => handleCopySlug(brand)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                            Copy Slug
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(brand)}
                            className="flex items-center gap-2 text-rose-600 focus:text-rose-700 focus:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Brand
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!isLoading && brands.length > 0 && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t border-slate-200 bg-slate-50/50 text-xs">
            <span className="text-slate-500">
              Showing page <strong className="text-slate-800">{pagination.page}</strong> of{" "}
              <strong className="text-slate-800">{pagination.totalPages}</strong> (
              {pagination.total} total brands)
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
                  {deleteTarget?.productCount > 0 ? "Cannot Delete Brand" : "Delete Brand"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {deleteTarget?.name} ({deleteTarget?.slug})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            {deleteTarget?.productCount > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Protected Brand Reference
                </div>
                <p>
                  This brand is currently linked to{" "}
                  <strong>
                    {deleteTarget.productCount}{" "}
                    {deleteTarget.productCount === 1 ? "product" : "products"}
                  </strong>
                  .
                </p>
                <p className="text-[11px] text-amber-700">
                  To prevent broken references in your apparel catalog, please reassign or remove this
                  brand from those products before attempting deletion.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900">&ldquo;{deleteTarget?.name}&rdquo;</strong>? This will remove
                the brand registry entry and all associated metadata. This action cannot be undone.
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
