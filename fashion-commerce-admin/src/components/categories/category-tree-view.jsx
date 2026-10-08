"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderTree,
  Folder,
  FolderPlus,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
  Package,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Check,
  Eye,
  ChevronsUpDown,
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
import { CategoryDialog } from "./category-dialog";

export function CategoryTreeView() {
  const router = useRouter();

  // Data states
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE
  const [hierarchyFilter, setHierarchyFilter] = useState("ALL"); // ALL, ROOT, CHILD

  // Tree UI states
  const [expandedIds, setExpandedIds] = useState(new Set());

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogInitial, setDialogInitial] = useState(null);
  const [dialogParent, setDialogParent] = useState(null);

  // Delete modal states
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load all categories from API
  const fetchCategories = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage("");

    try {
      // Query with status=ALL to get complete catalog hierarchy
      const res = await fetch("/api/categories?status=ALL");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load categories");
      }

      const fetched = json.data || [];
      setCategories(fetched);

      // Auto-expand all root categories initially
      setExpandedIds((prev) => {
        if (prev.size === 0) {
          const rootIds = new Set(fetched.filter((c) => !c.parentId).map((c) => String(c._id)));
          return rootIds;
        }
        return prev;
      });
    } catch (err) {
      setErrorMessage(err.message || "Failed to load categories");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Auto-hide success toast after 3.5s
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Build tree index: parentId -> children array
  const { rootCategories, childrenMap, categoryLookup } = useMemo(() => {
    const roots = [];
    const childMap = new Map();
    const lookup = new Map();

    categories.forEach((cat) => {
      lookup.set(String(cat._id), cat);
      const pid = cat.parentId?._id || cat.parentId ? String(cat.parentId?._id || cat.parentId) : null;
      if (!pid) {
        roots.push(cat);
      } else {
        if (!childMap.has(pid)) {
          childMap.set(pid, []);
        }
        childMap.get(pid).push(cat);
      }
    });

    return { rootCategories: roots, childrenMap: childMap, categoryLookup: lookup };
  }, [categories]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = categories.length;
    const rootCount = rootCategories.length;
    const subCount = total - rootCount;
    const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
    const activeCount = categories.filter((c) => c.isActive).length;

    return { total, rootCount, subCount, totalProducts, activeCount };
  }, [categories, rootCategories]);

  // Filter categories matching search & filters
  const isFiltering = Boolean(debouncedSearch || statusFilter !== "ALL" || hierarchyFilter !== "ALL");

  const filteredCategories = useMemo(() => {
    if (!isFiltering) return null;

    return categories.filter((cat) => {
      // 1. Search Query
      if (debouncedSearch) {
        const queryLower = debouncedSearch.toLowerCase();
        const matchName = cat.name.toLowerCase().includes(queryLower);
        const matchSlug = cat.slug.toLowerCase().includes(queryLower);
        if (!matchName && !matchSlug) return false;
      }

      // 2. Status Filter
      if (statusFilter === "ACTIVE" && !cat.isActive) return false;
      if (statusFilter === "INACTIVE" && cat.isActive) return false;

      // 3. Hierarchy Filter
      const isRoot = !cat.parentId;
      if (hierarchyFilter === "ROOT" && !isRoot) return false;
      if (hierarchyFilter === "CHILD" && isRoot) return false;

      return true;
    });
  }, [categories, isFiltering, debouncedSearch, statusFilter, hierarchyFilter]);

  // Expand / Collapse Toggles
  const toggleExpand = (catId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const expandAll = () => {
    const allParentIds = new Set(categories.map((c) => String(c._id)));
    setExpandedIds(allParentIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Quick Active/Inactive toggle directly from row
  const handleToggleStatus = async (cat, e) => {
    e?.stopPropagation();
    const newStatus = !cat.isActive;

    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c._id === cat._id ? { ...c, isActive: newStatus } : c))
    );

    try {
      const res = await fetch(`/api/categories/${cat._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update status");
      }
      setSuccessToast(`"${cat.name}" is now ${newStatus ? "Active" : "Inactive"}`);
    } catch (err) {
      // Rollback
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, isActive: !newStatus } : c))
      );
      setErrorMessage(err.message || "Failed to update category status");
    }
  };

  // Open Create Dialog for Root
  const handleOpenCreateRoot = () => {
    setDialogInitial(null);
    setDialogParent(null);
    setIsDialogOpen(true);
  };

  // Open Create Dialog for Subcategory
  const handleOpenCreateSubcategory = (parent) => {
    setDialogInitial(null);
    setDialogParent(parent);
    setIsDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (cat) => {
    setDialogInitial(cat);
    setDialogParent(null);
    setIsDialogOpen(true);
  };

  // Callback on Dialog Success
  const handleDialogSuccess = (savedCategory) => {
    fetchCategories(true);
    setSuccessToast(`Category "${savedCategory.name}" saved successfully.`);
  };

  // Trigger Safe Delete Modal
  const handlePromptDelete = (cat) => {
    setDeleteError("");
    setDeleteTarget(cat);
  };

  // Execute Safe Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/categories/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete category");
      }

      setSuccessToast(`Category "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
      fetchCategories(true);
    } catch (err) {
      setDeleteError(err.message || "Deletion failed due to an unexpected error.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Build breadcrumb string for a category (e.g. "Men > Shirts > Denim")
  const getCategoryBreadcrumb = (cat) => {
    const crumbs = [cat.name];
    let curr = cat;
    while (curr && curr.parentId) {
      const pid = curr.parentId?._id || curr.parentId;
      const parentDoc = categoryLookup.get(String(pid));
      if (parentDoc) {
        crumbs.unshift(parentDoc.name);
        curr = parentDoc;
      } else {
        break;
      }
    }
    return crumbs.join(" → ");
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (cat, depth = 0) => {
    const catId = String(cat._id);
    const children = childrenMap.get(catId) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(catId);

    return (
      <div key={cat._id} className="group">
        {/* Category Row */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${
            depth === 0 ? "bg-white font-medium" : "bg-slate-50/40"
          }`}
          style={{ paddingLeft: `${Math.max(16, 16 + depth * 28)}px` }}
        >
          {/* Left: Branch Indicator, Thumbnail, Name, Slugs */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Tree Branch Connector / Expand Chevron */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(catId)}
                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-slate-700" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
              </button>
            ) : (
              <div className="w-6 flex items-center justify-center text-slate-300 select-none">
                {depth > 0 ? "└" : "•"}
              </div>
            )}

            {/* Thumbnail Image */}
            <div className="h-8 w-8 rounded-md border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
              {cat.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <Folder className="h-4 w-4 text-slate-400" />
              )}
            </div>

            {/* Category Name & Slugs */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs ${depth === 0 ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}>
                  {cat.name}
                </span>

                {/* Level Badge */}
                {depth === 0 ? (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-slate-900 text-white font-semibold tracking-wider">
                    Root
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-200 text-slate-700">
                    Lvl {cat.level || depth}
                  </span>
                )}

                {/* Parent Cue if depth > 0 */}
                {cat.parentId && (
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">
                    in {cat.parentId.name || "parent"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                <span>/categories/{cat.slug}</span>
                {cat.displayOrder > 0 && (
                  <span className="text-slate-300">• Priority #{cat.displayOrder}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Live Product Count, Visibility Switch, Actions */}
          <div className="flex items-center gap-4 shrink-0 pl-2">
            {/* Live Product Count Badge */}
            <Link
              href={`/products?category=${cat._id}`}
              className="group/link flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-mono transition-colors"
              title="View live products in this category"
            >
              <Package className="h-3 w-3 text-slate-400 group-hover/link:text-slate-700" />
              <span>{cat.productCount || 0}</span>
              <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">products</span>
            </Link>

            {/* Active Toggle Switch */}
            <div className="flex items-center gap-1.5">
              <Switch
                checked={cat.isActive}
                onCheckedChange={(val) => handleToggleStatus(cat)}
                className="scale-90"
                title={cat.isActive ? "Visible in store" : "Hidden from store"}
              />
              <span className="text-[11px] font-mono text-slate-400 w-12 hidden md:inline">
                {cat.isActive ? (
                  <span className="text-emerald-600 font-medium">Active</span>
                ) : (
                  <span className="text-slate-400">Inactive</span>
                )}
              </span>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => handleOpenCreateSubcategory(cat)}
                  className="text-xs cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                  + Add Subcategory
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleOpenEdit(cat)}
                  className="text-xs cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-600" />
                  Edit Category
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(`/products?category=${cat._id}`)}
                  className="text-xs cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 mr-2 text-slate-600" />
                  View Products ({cat.productCount || 0})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handlePromptDelete(cat)}
                  className="text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-600" />
                  Delete Category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Recursive Children Rows */}
        {hasChildren && isExpanded && (
          <div className="border-l-2 border-slate-200/80 ml-6">
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Categories</h1>
            <Badge variant="outline" className="font-mono text-xs">
              Phase 4 Catalog
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Organize your apparel hierarchy, subcategories, product mappings, and merchandising structure.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCategories(true)}
            disabled={isRefreshing || isLoading}
            className="h-9 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 text-slate-500 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateRoot}
            className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            + Add Category
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
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

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between shadow-xs">
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

      {/* 2. KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Categories
            </span>
            <FolderTree className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{stats.total}</span>
            <span className="text-[10px] text-emerald-600 font-medium">
              {stats.activeCount} active
            </span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Root Departments
            </span>
            <Folder className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{stats.rootCount}</span>
            <span className="text-[10px] text-slate-400">Level 0</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Subcategories
            </span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{stats.subCount}</span>
            <span className="text-[10px] text-slate-400">Nested</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Products Mapped
            </span>
            <Package className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-900">{stats.totalProducts}</span>
            <span className="text-[10px] text-slate-400">Live products</span>
          </div>
        </Card>
      </div>

      {/* 3. Search & Filter Bar */}
      <Card className="bg-white border-slate-200 shadow-2xs p-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Left: Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories by name or URL slug..."
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

          {/* Right: Filters and Expand controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>

            {/* Hierarchy Filter */}
            <select
              value={hierarchyFilter}
              onChange={(e) => setHierarchyFilter(e.target.value)}
              className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Levels</option>
              <option value="ROOT">Root Only</option>
              <option value="CHILD">Subcategories Only</option>
            </select>

            {!isFiltering && (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={expandAll}
                  className="h-9 px-2 text-xs text-slate-600 hover:text-slate-900"
                  title="Expand all tree branches"
                >
                  Expand All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={collapseAll}
                  className="h-9 px-2 text-xs text-slate-600 hover:text-slate-900"
                  title="Collapse all tree branches"
                >
                  Collapse
                </Button>
              </div>
            )}

            {isFiltering && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setHierarchyFilter("ALL");
                }}
                className="h-9 px-2 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Tree View / Category List Container */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span>Category Name & Hierarchy</span>
          </div>
          <div className="flex items-center gap-10 pr-2">
            <span>Assigned Products</span>
            <span className="w-16 text-center">Status</span>
            <span className="w-8 text-right">Actions</span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
            <p className="text-xs">Loading categories hierarchy from MongoDB...</p>
          </div>
        ) : categories.length === 0 ? (
          /* Empty State: Zero Categories in Database */
          <div className="py-20 px-4 text-center max-w-md mx-auto">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FolderTree className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No categories created yet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Categories structure your fashion catalog into departments and collections (e.g. Men, Women, Outerwear, T-Shirts).
            </p>
            <Button
              onClick={handleOpenCreateRoot}
              className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              + Create First Category
            </Button>
          </div>
        ) : isFiltering ? (
          /* Filtered Results View: Flat list with ancestry breadcrumbs */
          filteredCategories.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Search className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No categories match your filters</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                Try adjusting your search keyword, status, or hierarchy filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setHierarchyFilter("ALL");
                }}
                className="h-8 text-xs"
              >
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50/50 text-[11px] text-slate-500 font-mono">
                Showing {filteredCategories.length} matching categor{filteredCategories.length === 1 ? "y" : "ies"}
              </div>
              {filteredCategories.map((cat) => (
                <div
                  key={cat._id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 rounded-md border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                      {cat.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Folder className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{cat.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {getCategoryBreadcrumb(cat)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                        <span>/categories/{cat.slug}</span>
                        <span>• Lvl {cat.level || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 pl-2">
                    <Link
                      href={`/products?category=${cat._id}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono"
                    >
                      <Package className="h-3 w-3 text-slate-400" />
                      <span>{cat.productCount || 0}</span>
                    </Link>

                    <Switch
                      checked={cat.isActive}
                      onCheckedChange={() => handleToggleStatus(cat)}
                      className="scale-90"
                    />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => handleOpenCreateSubcategory(cat)} className="text-xs">
                          <FolderPlus className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                          + Add Subcategory
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenEdit(cat)} className="text-xs">
                          <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-600" />
                          Edit Category
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/products?category=${cat._id}`)} className="text-xs">
                          <Eye className="h-3.5 w-3.5 mr-2 text-slate-600" />
                          View Products
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handlePromptDelete(cat)}
                          className="text-xs text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-600" />
                          Delete Category
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Full Hierarchical Tree View */
          <div className="divide-y divide-slate-100">
            {rootCategories.map((root) => renderTreeNode(root, 0))}
          </div>
        )}
      </Card>

      {/* 5. Create / Edit Category Modal Dialog */}
      <CategoryDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleDialogSuccess}
        initialCategory={dialogInitial}
        parentCategory={dialogParent}
        allCategories={categories}
      />

      {/* 6. Safe Deletion Confirmation Modal */}
      {deleteTarget && (
        <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <DialogTitle className="text-base font-bold text-slate-900">
                  Delete Category: {deleteTarget.name}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Evaluate catalog dependencies before deleting this category.
              </DialogDescription>
            </DialogHeader>

            {deleteError && (
              <div className="my-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Dependency Check Analysis */}
            {(() => {
              const childList = childrenMap.get(String(deleteTarget._id)) || [];
              const hasSubcategories = childList.length > 0;
              const hasProducts = (deleteTarget.productCount || 0) > 0;
              const isBlocked = hasSubcategories || hasProducts;

              if (isBlocked) {
                return (
                  <div className="space-y-3 py-2">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Deletion Blocked by Catalog Constraints</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        This category cannot be deleted while active subcategories or assigned products depend on it.
                      </p>
                    </div>

                    <div className="space-y-2 text-xs">
                      {hasSubcategories && (
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                          <span className="text-slate-600">Subcategories</span>
                          <span className="font-bold text-rose-600 font-mono">
                            {childList.length} subcategories exist
                          </span>
                        </div>
                      )}
                      {hasProducts && (
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                          <span className="text-slate-600">Active Products</span>
                          <span className="font-bold text-rose-600 font-mono">
                            {deleteTarget.productCount} products assigned
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 italic">
                      To safely delete this category, please reassign or delete its subcategories, and move products to another category first.
                    </p>
                  </div>
                );
              }

              return (
                <div className="py-2 space-y-2 text-xs text-slate-600">
                  <p>
                    Are you sure you want to permanently delete category{" "}
                    <strong className="text-slate-900">&quot;{deleteTarget.name}&quot;</strong>?
                  </p>
                  <p className="text-[11px] text-slate-400">
                    This category has 0 subcategories and 0 active products assigned. Deletion is safe and will remove the category URL <code className="font-mono text-slate-600">/categories/{deleteTarget.slug}</code>.
                  </p>
                </div>
              );
            })()}

            <DialogFooter className="pt-3 border-t border-slate-100 gap-2">
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
                disabled={
                  isDeleting ||
                  (childrenMap.get(String(deleteTarget._id)) || []).length > 0 ||
                  (deleteTarget.productCount || 0) > 0
                }
                className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium"
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
