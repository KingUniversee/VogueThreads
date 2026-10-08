"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TicketPercent,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit2,
  Archive,
  Trash2,
  Copy,
  Check,
  Calendar,
  Layers,
  AlertCircle,
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
import { CouponDialog } from "./coupon-dialog";
import { CouponDetailDialog } from "./coupon-detail-dialog";
import { toast } from "sonner";

export function CouponsListView() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalCoupons: 0,
    activeCoupons: 0,
    totalRedemptions: 0,
    totalDiscountGiven: 0,
    expiringSoon: 0,
  });

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [validityFilter, setValidityFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailCoupon, setDetailCoupon] = useState(null);

  // Delete & Archive Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Copy code feedback state
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("discountType", typeFilter);
      if (validityFilter !== "ALL") params.set("validity", validityFilter);

      const res = await fetch(`/api/coupons?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load coupons");
      }

      setCoupons(data.coupons || []);
      setTotalPages(data.totalPages || 1);
      if (data.metrics) {
        setMetrics({
          totalCoupons: Number(data.metrics.totalCoupons ?? 0),
          activeCoupons: Number(data.metrics.activeCoupons ?? 0),
          totalRedemptions: Number(data.metrics.totalRedemptions ?? 0),
          totalDiscountGiven: Number(data.metrics.totalDiscountGiven ?? 0),
          expiringSoon: Number(data.metrics.expiringSoon ?? 0),
        });
      }
    } catch (err) {
      console.error("Load coupons error:", err);
      toast.error(err.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter, validityFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied '${code}' to clipboard`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleStatus = async (coupon) => {
    const newStatus = coupon.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/coupons/${coupon._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status");
      }

      toast.success(`Coupon '${coupon.code}' set to ${newStatus}`);
      fetchCoupons();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleArchiveCoupon = async (coupon) => {
    try {
      const res = await fetch(`/api/coupons/${coupon._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to archive coupon");
      }

      toast.success(`Coupon '${coupon.code}' archived`);
      fetchCoupons();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/coupons/${couponToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete coupon");
      }

      toast.success(data.message || `Coupon '${couponToDelete.code}' deleted`);
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
      fetchCoupons();
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
        title="Coupons & Promo Codes"
        description="Manage promotional coupon codes, percentage/fixed discounts, usage quotas, and targeting restrictions."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCoupons}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedCoupon(null);
                setCreateDialogOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Coupon
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Coupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {(metrics.activeCoupons ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Of {(metrics.totalCoupons ?? 0).toLocaleString("en-IN")} total coupons
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Redemptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {(metrics.totalRedemptions ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Customer redemptions to date</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Discount Savings Given
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatINR(metrics.totalDiscountGiven ?? 0, false)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Total revenue discounted</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {(metrics.expiringSoon ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Within next 7 days</p>
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
                placeholder="Search coupon code..."
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
                <SelectValue placeholder="Discount: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Discount: All</SelectItem>
                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                <SelectItem value="FIXED">Flat INR (₹)</SelectItem>
              </SelectContent>
            </Select>

            {/* Validity Filter */}
            <Select
              value={validityFilter}
              onValueChange={(val) => {
                setValidityFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Validity: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Validity: All</SelectItem>
                <SelectItem value="ACTIVE_NOW">Active Now</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card className="shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coupon Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Conditions</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Validity Window</TableHead>
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
                    Loading coupons...
                  </div>
                </TableCell>
              </TableRow>
            ) : coupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-36 text-center text-xs text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <TicketPercent className="w-8 h-8 text-slate-300" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      No coupons found
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Create a promo code or adjust your search filters
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              coupons.map((coupon) => {
                const isExpired = coupon.endAt && new Date(coupon.endAt) < new Date();
                const isScheduled = coupon.startAt && new Date(coupon.startAt) > new Date();

                return (
                  <TableRow key={coupon._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    {/* Code & Copy */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="text-slate-400 hover:text-slate-600 p-0.5 transition-colors"
                          title="Copy Code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {coupon.description && (
                        <p className="text-[11px] text-slate-500 max-w-xs truncate mt-0.5">
                          {coupon.description}
                        </p>
                      )}
                    </TableCell>

                    {/* Discount */}
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {coupon.discountType === "PERCENTAGE"
                          ? `${coupon.discountValue}% OFF`
                          : `${formatINR(coupon.discountValue, false)} FLAT OFF`}
                      </div>
                      {coupon.discountType === "PERCENTAGE" && coupon.maximumDiscountAmount && (
                        <span className="text-[10px] text-slate-400 block">
                          Up to {formatINR(coupon.maximumDiscountAmount, false)}
                        </span>
                      )}
                    </TableCell>

                    {/* Conditions */}
                    <TableCell>
                      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                        <div>
                          Min: {coupon.minimumOrderValue ? formatINR(coupon.minimumOrderValue, false) : "₹0"}
                        </div>
                        {coupon.firstOrderOnly && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1">
                            1st Order
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Usage */}
                    <TableCell>
                      <div className="text-xs">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {coupon.usageCount || 0}
                        </span>
                        <span className="text-slate-400">
                          {" "}/ {coupon.usageLimit ? coupon.usageLimit : "∞"}
                        </span>
                      </div>
                      {coupon.usageLimit && (
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                ((coupon.usageCount || 0) / coupon.usageLimit) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </TableCell>

                    {/* Validity Window */}
                    <TableCell>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <div>{formatDate(coupon.startAt)}</div>
                        <div className="text-[11px] text-slate-400">
                          {coupon.endAt ? `to ${formatDate(coupon.endAt)}` : "No expiry"}
                        </div>
                      </div>
                    </TableCell>

                    {/* Status Toggle */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={coupon.status === "ACTIVE" && !isExpired}
                          disabled={coupon.status === "ARCHIVED" || isExpired}
                          onCheckedChange={() => handleToggleStatus(coupon)}
                        />
                        <Badge
                          variant={
                            coupon.status === "ACTIVE" && !isExpired
                              ? "success"
                              : coupon.status === "ARCHIVED"
                              ? "secondary"
                              : "destructive"
                          }
                          className="text-[10px] uppercase"
                        >
                          {isExpired ? "EXPIRED" : isScheduled ? "SCHEDULED" : coupon.status}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs">Coupon Options</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setDetailCoupon(coupon);
                              setDetailDialogOpen(true);
                            }}
                            className="text-xs gap-2"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setCreateDialogOpen(true);
                            }}
                            className="text-xs gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit Rules
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {coupon.status !== "ARCHIVED" && (
                            <DropdownMenuItem
                              onClick={() => handleArchiveCoupon(coupon)}
                              className="text-xs gap-2"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              Archive Coupon
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setCouponToDelete(coupon);
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
      <CouponDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        coupon={selectedCoupon}
        onSuccess={fetchCoupons}
      />

      {/* View Details Dialog */}
      <CouponDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        coupon={detailCoupon}
      />

      {/* Delete / Archive Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Delete Coupon
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete coupon{" "}
              <strong className="font-mono">{couponToDelete?.code}</strong>?
              <br />
              <br />
              Note: If this coupon has already been redeemed by customers in historical orders, permanent deletion will be prevented to protect accounting records. You can archive the coupon instead.
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
