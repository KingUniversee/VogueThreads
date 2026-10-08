"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  EyeOff,
  Search,
  RefreshCw,
  MoreVertical,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/formatters";
import { ReviewModerateDialog } from "./review-moderate-dialog";
import { ReviewResponseDialog } from "./review-response-dialog";
import { toast } from "sonner";

export function ReviewsListView() {
  const [reviews, setReviews] = useState([]);
  const [metrics, setMetrics] = useState({
    totalReviews: 0,
    averageRating: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    hidden: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ratingFilter, setRatingFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Dialog states
  const [selectedReview, setSelectedReview] = useState(null);
  const [moderateDialogOpen, setModerateDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (ratingFilter !== "ALL") params.set("rating", ratingFilter);

      const res = await fetch(`/api/reviews?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load reviews");
      }

      setReviews(data.reviews || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error("Fetch reviews error:", err);
      toast.error(err.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleQuickApprove = async (review) => {
    try {
      const res = await fetch(`/api/reviews/${review._id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "APPROVED",
          reason: "Quick approved via admin table",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to approve review");
      }
      toast.success("Review approved");
      fetchReviews();
    } catch (err) {
      console.error("Quick approve error:", err);
      toast.error(err.message || "Failed to approve");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!reviewToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete review");
      }
      toast.success("Review deleted successfully");
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
      fetchReviews();
    } catch (err) {
      console.error("Delete review error:", err);
      toast.error(err.message || "Failed to delete review");
    } finally {
      setDeleting(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= rating
                ? "fill-amber-400 text-amber-400"
                : "fill-slate-100 text-slate-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>;
      case "PENDING":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case "REJECTED":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>;
      case "HIDDEN":
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Hidden</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Reviews & Ratings"
        description="Moderate customer product ratings, verify genuine purchasers, post official store responses, and maintain review standards."
        badge={
          <Badge variant="outline" className="text-slate-600 bg-white">
            {metrics.totalReviews} Total Reviews
          </Badge>
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => fetchReviews()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Average Store Rating</CardTitle>
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {metrics.averageRating > 0 ? `${metrics.averageRating} / 5.0` : "No Ratings"}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Across approved reviews</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Pending Moderation</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.pending}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Awaiting staff review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Approved Reviews</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metrics.approved}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Public on storefront</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Rejected / Spam</CardTitle>
            <XCircle className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{metrics.rejected}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Filtered from catalog</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search reviews by product, customer, or content..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter */}
              <div className="w-[140px]">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending ({metrics.pending})</SelectItem>
                    <SelectItem value="APPROVED">Approved ({metrics.approved})</SelectItem>
                    <SelectItem value="REJECTED">Rejected ({metrics.rejected})</SelectItem>
                    <SelectItem value="HIDDEN">Hidden ({metrics.hidden})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Star Rating Filter */}
              <div className="w-[140px]">
                <Select
                  value={ratingFilter}
                  onValueChange={(val) => {
                    setRatingFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[240px]">Product</TableHead>
                  <TableHead className="w-[200px]">Customer</TableHead>
                  <TableHead className="w-[120px]">Rating</TableHead>
                  <TableHead className="min-w-[280px]">Review</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[110px]">Response</TableHead>
                  <TableHead className="text-right w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="text-xs">Loading customer reviews...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : reviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                        <MessageSquare className="h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-700">No reviews found</p>
                        <p className="text-xs text-slate-400">
                          Customer feedback will appear here as orders are reviewed.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  reviews.map((r) => {
                    const prod = r.productId || {};
                    const primaryImg = prod.primaryImages?.[0]?.url || "";

                    return (
                      <TableRow key={r._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Product Column */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            {primaryImg ? (
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-slate-200 bg-slate-100">
                                <Image
                                  src={primaryImg}
                                  alt={prod.title || "Product"}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-400">
                                NO IMG
                              </div>
                            )}
                            <div className="min-w-0">
                              <Link
                                href={`/products/${prod._id}`}
                                className="text-xs font-semibold text-slate-900 hover:text-blue-600 block truncate"
                              >
                                {prod.title || "Product"}
                              </Link>
                              <p className="text-[11px] text-slate-400 truncate">
                                {prod.sku || r.variantSku || "—"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Customer Column */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-slate-900 truncate">
                                {r.customerName}
                              </span>
                              {r.isVerifiedBuyer && (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] px-1 py-0 gap-0.5">
                                  <ShieldCheck className="h-2.5 w-2.5" /> Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">{r.customerEmail}</p>
                            <p className="text-[10px] text-slate-400">
                              {formatDate(r.createdAt, { shortMonth: true })}
                            </p>
                          </div>
                        </TableCell>

                        {/* Rating */}
                        <TableCell>
                          <div className="space-y-1">
                            {renderStars(r.rating)}
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {r.rating} of 5 stars
                            </span>
                          </div>
                        </TableCell>

                        {/* Content */}
                        <TableCell>
                          <div className="space-y-1 max-w-sm">
                            {r.title && (
                              <p className="text-xs font-semibold text-slate-900">{r.title}</p>
                            )}
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {r.content}
                            </p>
                            {r.adminResponse?.response && (
                              <div className="rounded border-l-2 border-blue-500 bg-blue-50/60 p-1.5 text-[11px] text-slate-700">
                                <span className="font-semibold text-blue-900">Store Response:</span>{" "}
                                {r.adminResponse.response}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>{getStatusBadge(r.status)}</TableCell>

                        {/* Response */}
                        <TableCell>
                          {r.adminResponse?.response ? (
                            <Badge variant="outline" className="text-blue-700 bg-blue-50 text-[10px]">
                              Replied
                            </Badge>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedReview(r);
                                setResponseDialogOpen(true);
                              }}
                              className="h-7 text-xs text-blue-600 hover:text-blue-700 px-2"
                            >
                              <MessageSquare className="h-3 w-3 mr-1" /> Reply
                            </Button>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs">Moderation</DropdownMenuLabel>
                              {r.status !== "APPROVED" && (
                                <DropdownMenuItem onClick={() => handleQuickApprove(r)}>
                                  <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                                  Approve Review
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedReview(r);
                                  setModerateDialogOpen(true);
                                }}
                              >
                                <Clock className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                Change Decision
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedReview(r);
                                  setResponseDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="mr-2 h-3.5 w-3.5 text-blue-600" />
                                {r.adminResponse?.response ? "Edit Response" : "Post Response"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setReviewToDelete(r);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600" />
                                Delete Review
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
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Showing {reviews.length > 0 ? (page - 1) * limit + 1 : 0} -{" "}
                {Math.min(page * limit, totalCount)} of {totalCount} reviews</span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <ReviewModerateDialog
        open={moderateDialogOpen}
        onOpenChange={setModerateDialogOpen}
        review={selectedReview}
        onSuccess={() => fetchReviews()}
      />

      <ReviewResponseDialog
        open={responseDialogOpen}
        onOpenChange={setResponseDialogOpen}
        review={selectedReview}
        onSuccess={() => fetchReviews()}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Customer Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this review from{" "}
              <span className="font-semibold text-slate-800">
                {reviewToDelete?.customerName}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
