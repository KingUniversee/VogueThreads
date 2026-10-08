"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BadgePercent,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit2,
  Archive,
  Trash2,
  AlertCircle,
  Calendar,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { formatINR, formatDate } from "@/lib/formatters";
import { DiscountDialog } from "./discount-dialog";
import { DiscountDetailDialog } from "./discount-detail-dialog";
import { toast } from "sonner";

export function DiscountsListView() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalDiscounts: 0,
    activeDiscounts: 0,
    scheduledDiscounts: 0,
    expiredDiscounts: 0,
  });

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("priority");
  const [sortOrder, setSortOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailDiscount, setDetailDiscount] = useState(null);

  // Delete & Archive Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        sortBy,
        sortOrder,
      });

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("discountType", typeFilter);

      const res = await fetch(`/api/discounts?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load discounts");
      }

      setDiscounts(data.discounts || []);
      setTotalPages(data.totalPages || 1);
      if (data.metrics) {
        setMetrics({
          totalDiscounts: Number(data.metrics.totalDiscounts ?? 0),
          activeDiscounts: Number(data.metrics.activeDiscounts ?? 0),
          scheduledDiscounts: Number(data.metrics.scheduledDiscounts ?? 0),
          expiredDiscounts: Number(data.metrics.expiredDiscounts ?? 0),
        });
      }
    } catch (err) {
      console.error("Load discounts error:", err);
      toast.error(err.message || "Failed to load discounts");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleToggleStatus = async (discount) => {
    const newStatus = discount.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/discounts/${discount._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(`Promotion '${discount.name}' set to ${newStatus}`);
      fetchDiscounts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleArchiveDiscount = async (discount) => {
    try {
      const res = await fetch(`/api/discounts/${discount._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to archive promotion");
      }

      toast.success(`Promotion '${discount.name}' archived`);
      fetchDiscounts();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!discountToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/discounts/${discountToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete promotion");
      }

      toast.success(data.message || `Promotion '${discountToDelete.name}' deleted`);
      setDeleteDialogOpen(false);
      setDiscountToDelete(null);
      fetchDiscounts();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Automatic & Tiered Discounts"
        description="Configure automated storewide, category, or collection-level pricing promotions (e.g. Flash Sales, Tiered Spend & Save)."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDiscounts}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedDiscount(null);
                setCreateDialogOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Promotion
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Promotions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {(metrics.activeDiscounts ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Currently evaluating at cart</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Promotions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {(metrics.totalDiscounts ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Configured store promotions</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Scheduled Promotions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {(metrics.scheduledDiscounts ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Upcoming promotions</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Expired Promotions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-500">
              {(metrics.expiredDiscounts ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Past promotions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search promotion name..."
                className="pl-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Status: All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Type: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Type: All</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                <SelectItem value="FIXED">Flat INR (₹)</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val);
                setSortOrder(val === "priority" ? "asc" : "desc");
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority Rank (1st First)</SelectItem>
                <SelectItem value="createdAt">Date Created (Newest)</SelectItem>
                <SelectItem value="discountValue">Discount Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Priority</TableHead>
              <TableHead>Promotion</TableHead>
              <TableHead>Discount Value</TableHead>
              <TableHead>Rules & Stacking</TableHead>
              <TableHead>Schedule Window</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    Loading promotions...
                  </div>
                </TableCell>
              </TableRow>
            ) : discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <BadgePercent className="w-8 h-8 text-slate-300" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      No automatic promotions found
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Create a promotional discount rule or adjust search filters
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => {
                const isExpired = discount.endAt && new Date(discount.endAt) < new Date();
                const isScheduled = discount.startAt && new Date(discount.startAt) > new Date();

                return (
                  <TableRow key={discount._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    {/* Priority Badge */}
                    <TableCell>
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700">
                        #{discount.priority || 10}
                      </span>
                    </TableCell>

                    {/* Promotion Name */}
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {discount.name}
                      </div>
                      {discount.description && (
                        <p className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5">
                          {discount.description}
                        </p>
                      )}
                    </TableCell>

                    {/* Discount Value */}
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {discount.discountType === "PERCENTAGE"
                          ? `${discount.discountValue}% OFF`
                          : `${formatINR(discount.discountValue, false)} FLAT OFF`}
                      </div>
                      {discount.discountType === "PERCENTAGE" && discount.maximumDiscountAmount && (
                        <span className="text-[10px] text-slate-400 block">
                          Up to {formatINR(discount.maximumDiscountAmount, false)}
                        </span>
                      )}
                    </TableCell>

                    {/* Rules & Stacking */}
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <div className="text-slate-600 dark:text-slate-400">
                          Min: {discount.minimumOrderValue ? formatINR(discount.minimumOrderValue, false) : "₹0"}
                        </div>
                        <Badge
                          variant={discount.stacking === "EXCLUSIVE" ? "secondary" : "outline"}
                          className="text-[10px] py-0 px-1 font-mono"
                        >
                          {discount.stacking || "EXCLUSIVE"}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Schedule */}
                    <TableCell>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <div>{formatDate(discount.startAt)}</div>
                        <div className="text-[11px] text-slate-400">
                          {discount.endAt ? `to ${formatDate(discount.endAt)}` : "Ongoing"}
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={discount.status === "ACTIVE" && !isExpired}
                          disabled={discount.status === "ARCHIVED" || isExpired}
                          onCheckedChange={() => handleToggleStatus(discount)}
                        />
                        <Badge
                          variant={
                            discount.status === "ACTIVE" && !isExpired
                              ? "success"
                              : discount.status === "ARCHIVED"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-[10px] uppercase"
                        >
                          {isExpired ? "EXPIRED" : isScheduled ? "SCHEDULED" : discount.status}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs">Promotion Options</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setDetailDiscount(discount);
                              setDetailDialogOpen(true);
                            }}
                            className="text-xs gap-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedDiscount(discount);
                              setCreateDialogOpen(true);
                            }}
                            className="text-xs gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit Promotion
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {discount.status !== "ARCHIVED" && (
                            <DropdownMenuItem
                              onClick={() => handleArchiveDiscount(discount)}
                              className="text-xs gap-2"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Archive Promotion
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setDiscountToDelete(discount);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-xs gap-2 text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <DiscountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        discount={selectedDiscount}
        onSuccess={fetchDiscounts}
      />

      {/* View Details Dialog */}
      <DiscountDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        discount={detailDiscount}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete Promotion
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete promotion{" "}
              <strong>{discountToDelete?.name}</strong>?
              <br />
              <br />
              If this promotion is linked to historical orders, deletion will be blocked and you will be advised to archive it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
