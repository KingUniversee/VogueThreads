"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Search,
  RotateCcw,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Filter,
  PackageCheck,
  CreditCard,
  RefreshCw,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Printer,
  SlidersHorizontal,
} from "lucide-react";
import { formatINR, formatDate } from "@/lib/formatters";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { getStatusConfig } from "@/lib/order-status";
import { OrderStatusDialog } from "./order-status-dialog";
import { OrderCancelDialog } from "./order-cancel-dialog";
import { OrderInvoiceDialog } from "./order-invoice-dialog";
import { toast } from "sonner";

export function OrdersListView() {
  const [orders, setOrders] = useState([]);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    pendingPayment: 0,
    confirmed: 0,
    paid: 0,
    processing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
    refunded: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [activeOrder, setActiveOrder] = useState(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });

      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (paymentStatusFilter !== "ALL") params.append("paymentStatus", paymentStatusFilter);
      if (paymentMethodFilter !== "ALL") params.append("paymentMethod", paymentMethodFilter);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch orders");
      }

      setOrders(data.orders || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, paymentStatusFilter, paymentMethodFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(`Copied ${text}`);
    setTimeout(() => setCopiedId(""), 2000);
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (statusFilter !== "ALL") params.append("status", statusFilter);
    if (paymentStatusFilter !== "ALL") params.append("paymentStatus", paymentStatusFilter);
    window.open(`/api/orders/export?${params.toString()}`, "_blank");
  };

  const handleOrderMutated = () => {
    fetchOrders();
  };

  const STATUS_TABS = [
    { id: "ALL", label: "All Orders", count: metrics.totalOrders },
    { id: "PENDING_PAYMENT", label: "Pending", count: metrics.pendingPayment },
    { id: "CONFIRMED", label: "Confirmed", count: metrics.confirmed },
    { id: "PROCESSING", label: "Processing", count: metrics.processing },
    { id: "PACKED", label: "Packed", count: metrics.packed },
    { id: "SHIPPED", label: "Shipped", count: metrics.shipped },
    { id: "DELIVERED", label: "Delivered", count: metrics.delivered },
    { id: "CANCELLED", label: "Cancelled", count: metrics.cancelled },
    { id: "RETURNED", label: "Returned", count: metrics.returned },
    { id: "REFUNDED", label: "Refunded", count: metrics.refunded },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Orders Management"
        description="Track customer orders, payments, fulfillment dispatch, returns, and inventory handshakes."
      >
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* 6 KPI Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight mt-2 text-foreground">
            {metrics.totalOrders}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5">All time orders</span>
        </Card>

        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending/Conf.</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight mt-2 text-amber-600 dark:text-amber-400">
            {metrics.pendingPayment + metrics.confirmed}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5">Awaiting warehouse pick</span>
        </Card>

        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Processing</span>
            <RefreshCw className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight mt-2 text-indigo-600 dark:text-indigo-400">
            {metrics.processing + metrics.packed}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5">Packing in warehouse</span>
        </Card>

        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-cyan-600 dark:text-cyan-400">
            <span className="text-xs font-semibold uppercase tracking-wider">In Transit</span>
            <Truck className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight mt-2 text-cyan-600 dark:text-cyan-400">
            {metrics.shipped}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5">Dispatched with courier</span>
        </Card>

        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight mt-2 text-emerald-600 dark:text-emerald-400">
            {metrics.delivered}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5">Completed deliveries</span>
        </Card>

        <Card className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-primary">
            <span className="text-xs font-semibold uppercase tracking-wider">Order Revenue</span>
            <span className="text-xs font-bold">₹</span>
          </div>
          <p className="text-2xl font-bold tracking-tight mt-2 text-foreground font-mono">
            {formatINR(metrics.totalRevenue)}
          </p>
          <span className="text-[11px] text-muted-foreground mt-0.5">Excludes cancellations</span>
        </Card>
      </div>

      {/* Main Order Pipeline Workspace */}
      <Card>
        <CardHeader className="p-4 border-b space-y-4">
          {/* Status Pipeline Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Secondary Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search Order #, customer, SKU..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-md border bg-background"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={paymentMethodFilter}
                onValueChange={(v) => {
                  setPaymentMethodFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Methods</SelectItem>
                  <SelectItem value="COD">Cash on Delivery</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Debit / Credit Card</SelectItem>
                  <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                  <SelectItem value="RAZORPAY">Razorpay</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={paymentStatusFilter}
                onValueChange={(v) => {
                  setPaymentStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Pay Status</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                  <SelectItem value="PARTIALLY_REFUNDED">Partially Refunded</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(v) => {
                  const [field, order] = v.split("-");
                  setSortBy(field);
                  setSortOrder(order);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                  <SelectItem value="pricing.grandTotal-desc">Highest Amount</SelectItem>
                  <SelectItem value="pricing.grandTotal-asc">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs uppercase text-muted-foreground bg-muted/20">
                  <TableHead className="w-[140px]">Order #</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="min-w-[180px]">Customer</TableHead>
                  <TableHead className="min-w-[200px]">Items Preview</TableHead>
                  <TableHead className="text-right w-[110px]">Grand Total</TableHead>
                  <TableHead className="w-[130px]">Payment</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px]">Fulfillment</TableHead>
                  <TableHead className="text-right w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-xs">Loading orders pipeline...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                        <div className="p-3 rounded-full bg-muted text-muted-foreground">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                        <p className="text-sm font-semibold">No customer orders found</p>
                        <p className="text-xs text-muted-foreground">
                          {search.trim() || statusFilter !== "ALL" || paymentStatusFilter !== "ALL"
                            ? "No orders match the current filter criteria. Try clearing search or status filters."
                            : "Your order pipeline is currently clear. When customers purchase apparel from the storefront, incoming orders and inventory reservations will appear here in real time."}
                        </p>
                        {(search.trim() || statusFilter !== "ALL" || paymentStatusFilter !== "ALL") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("ALL");
                              setPaymentStatusFilter("ALL");
                              setPaymentMethodFilter("ALL");
                            }}
                          >
                            Reset Filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((ord) => {
                    const statusCfg = getStatusConfig(ord.status);
                    const firstItem = ord.items?.[0] || {};
                    const extraItemsCount = (ord.items?.length || 1) - 1;

                    return (
                      <TableRow key={ord._id} className="text-xs hover:bg-muted/40 transition-colors">
                        {/* Order Number */}
                        <TableCell className="font-mono font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={`/orders/${ord.orderNumber}`}
                              className="text-primary hover:underline"
                            >
                              {ord.orderNumber}
                            </Link>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(ord.orderNumber)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Copy Order Number"
                            >
                              {copiedId === ord.orderNumber ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-muted-foreground">
                          <div>
                            <p className="font-medium text-foreground">
                              {ord.createdAt ? formatDate(ord.createdAt) : "N/A"}
                            </p>
                            <p className="text-[10px]">
                              {ord.createdAt
                                ? new Date(ord.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </p>
                          </div>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground truncate max-w-[160px]">
                              {ord.customerDetails?.name || "Guest Customer"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                              {ord.customerDetails?.email}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {ord.shippingAddress?.city
                                ? `${ord.shippingAddress.city}, ${ord.shippingAddress.state || ""}`
                                : "India"}
                            </p>
                          </div>
                        </TableCell>

                        {/* Items Preview */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {firstItem.image ? (
                              <img
                                src={firstItem.image}
                                alt=""
                                className="h-8 w-8 rounded object-cover border shrink-0 bg-muted"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded border bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-mono text-[10px]">
                                VT
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[160px]">
                                {firstItem.title || "Apparel Item"}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {firstItem.colorHex && (
                                  <span
                                    className="h-2 w-2 rounded-full border shrink-0"
                                    style={{ backgroundColor: firstItem.colorHex }}
                                  />
                                )}
                                <span>
                                  {firstItem.color} / {firstItem.size}
                                </span>
                                <span>× {firstItem.quantity}</span>
                                {extraItemsCount > 0 && (
                                  <span className="font-semibold text-primary">
                                    +{extraItemsCount} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Grand Total */}
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          {formatINR(ord.pricing?.grandTotal || 0)}
                        </TableCell>

                        {/* Payment */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold uppercase tracking-wider text-[10px] text-foreground">
                              {ord.payment?.method || "UPI"}
                            </span>
                            <div>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1.5 py-0 ${
                                  ord.payment?.status === "PAID" || ord.payment?.status === "CAPTURED"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : ord.payment?.status === "REFUNDED"
                                    ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}
                              >
                                {ord.payment?.status || "PENDING"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        {/* Order Status */}
                        <TableCell>
                          <Badge variant={statusCfg.badgeVariant} className={statusCfg.color}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>

                        {/* Fulfillment */}
                        <TableCell>
                          {ord.fulfillment?.carrier ? (
                            <div className="text-[11px] space-y-0.5">
                              <p className="font-medium text-foreground">
                                {ord.fulfillment.carrier}
                              </p>
                              {ord.fulfillment.awbNumber && (
                                <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                                  {ord.fulfillment.awbNumber}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 text-xs">
                              <DropdownMenuLabel>Order Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/orders/${ord.orderNumber}`}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-primary" />
                                  View Workspace
                                </Link>
                              </DropdownMenuItem>

                              {!statusCfg.isTerminal && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActiveOrder(ord);
                                    setStatusDialogOpen(true);
                                  }}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
                                  Update Status
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => {
                                  setActiveOrder(ord);
                                  setInvoiceDialogOpen(true);
                                }}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                                Print Invoice
                              </DropdownMenuItem>

                              {!statusCfg.isTerminal && ord.status !== "SHIPPED" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setActiveOrder(ord);
                                      setCancelDialogOpen(true);
                                    }}
                                    className="flex items-center gap-2 text-destructive cursor-pointer"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Cancel Order
                                  </DropdownMenuItem>
                                </>
                              )}
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
          {totalPages > 1 && (
            <div className="p-3.5 border-t flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
              <div>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of{" "}
                {totalCount} orders
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="px-2 font-medium text-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <OrderStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        order={activeOrder}
        onStatusUpdated={handleOrderMutated}
      />

      <OrderCancelDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        order={activeOrder}
        onOrderCancelled={handleOrderMutated}
      />

      <OrderInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        order={activeOrder}
      />
    </div>
  );
}
