"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CreditCard,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Send,
  Boxes,
  MapPin,
  User,
  ExternalLink,
  AlertTriangle,
  Receipt,
  FileText,
} from "lucide-react";
import { formatINR, formatDate } from "@/lib/formatters";
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
  getStatusConfig,
  isOrderCancellable,
  isOrderReturnable,
  isOrderRefundable,
} from "@/lib/order-status";
import { OrderStatusDialog } from "./order-status-dialog";
import { OrderCancelDialog } from "./order-cancel-dialog";
import { OrderReturnDialog } from "./order-return-dialog";
import { OrderRefundDialog } from "./order-refund-dialog";
import { OrderInvoiceDialog } from "./order-invoice-dialog";
import { toast } from "sonner";

export function OrderDetailView({ orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dialogs state
  const [statusOpen, setStatusOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load order");
      }
      setOrder(data.order);
    } catch (err) {
      toast.error(err.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const copyOrderNumber = () => {
    if (!order?.orderNumber) return;
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    toast.success(`Copied ${order.orderNumber}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/orders/${order._id || order.orderNumber}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add note");
      }
      toast.success("Internal note added");
      setOrder((prev) => ({ ...prev, adminNotes: data.notes }));
      setNewNote("");
    } catch (err) {
      toast.error(err.message || "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <RefreshCw className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm">Loading order workspace...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-center">
        <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Order Not Found</h2>
        <p className="text-xs text-muted-foreground max-w-sm">
          No order matching identifier &ldquo;{orderId}&rdquo; was found in the database.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link href="/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  const statusCfg = getStatusConfig(order.status);
  const pricing = order.pricing || {};
  const shipping = order.shippingAddress || {};
  const billing = order.billingAddress || shipping;
  const payment = order.payment || {};
  const fulfillment = order.fulfillment || {};
  const invState = order.inventoryState || {};

  const cancellable = isOrderCancellable(order.status);
  const returnable = isOrderReturnable(order.status);
  const refundable = isOrderRefundable(order.status, payment.status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 -ml-2 text-muted-foreground">
              <Link href="/orders">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Orders
              </Link>
            </Button>
            <span className="text-muted-foreground text-xs">/</span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {order.orderNumber}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {order.orderNumber}
            </h1>
            <button
              onClick={copyOrderNumber}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Copy Order Number"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <Badge variant={statusCfg.badgeVariant} className={statusCfg.color}>
              {statusCfg.label}
            </Badge>
            <Badge
              variant="outline"
              className={
                payment.status === "PAID" || payment.status === "CAPTURED"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : payment.status === "REFUNDED"
                  ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              }
            >
              {payment.method} • {payment.status}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Placed on {order.createdAt ? formatDate(order.createdAt) : "N/A"}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {!statusCfg.isTerminal && (
            <Button size="sm" onClick={() => setStatusOpen(true)} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Update Status
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setInvoiceOpen(true)}
            className="gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Invoice
          </Button>

          {refundable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRefundOpen(true)}
              className="gap-1.5 text-teal-700 dark:text-teal-400"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Refund
            </Button>
          )}

          {returnable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReturnOpen(true)}
              className="gap-1.5 text-orange-700 dark:text-orange-400"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Return
            </Button>
          )}

          {cancellable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCancelOpen(true)}
              className="gap-1.5 text-rose-600 hover:text-rose-700"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Left 2/3 Content + Right 1/3 Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Items, Pricing, Timeline, Staff Notes) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items Table Card */}
          <Card>
            <CardHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  Ordered Items ({order.items?.length || 0})
                </CardTitle>
                <span className="text-xs text-muted-foreground font-mono">
                  {order.items?.reduce((acc, i) => acc + i.quantity, 0)} total units
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] uppercase text-muted-foreground bg-muted/20">
                    <TableHead className="min-w-[220px]">Item</TableHead>
                    <TableHead className="w-[80px]">HSN</TableHead>
                    <TableHead className="text-right w-[90px]">Unit Price</TableHead>
                    <TableHead className="text-center w-[70px]">Qty</TableHead>
                    <TableHead className="text-right w-[90px]">GST</TableHead>
                    <TableHead className="text-right w-[100px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(order.items || []).map((item, idx) => (
                    <TableRow key={idx} className="text-xs">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="h-10 w-10 rounded object-cover border shrink-0 bg-muted"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0 text-muted-foreground font-mono text-xs">
                              VT
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{item.title}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                              {item.colorHex && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full border shrink-0"
                                  style={{ backgroundColor: item.colorHex }}
                                />
                              )}
                              <span>
                                {item.color} / {item.size}
                              </span>
                              <span>•</span>
                              <span className="font-mono">{item.sku}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {item.hsnCode || "6109"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatINR(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatINR(item.taxAmount?.total || 0)}
                        <span className="text-[10px] block opacity-80">({item.gstRate || 5}%)</span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground">
                        {formatINR(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pricing & GST Breakdown Card */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Financial & GST Tax Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="max-w-md ml-auto space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (Excl. Tax):</span>
                  <span className="font-mono text-foreground">{formatINR(pricing.subtotal || 0)}</span>
                </div>

                {pricing.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount {pricing.couponCode ? `(${pricing.couponCode})` : ""}:</span>
                    <span className="font-mono">-{formatINR(pricing.discountAmount)}</span>
                  </div>
                )}

                {pricing.taxBreakdown?.cgstTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST:</span>
                    <span className="font-mono">{formatINR(pricing.taxBreakdown.cgstTotal)}</span>
                  </div>
                )}

                {pricing.taxBreakdown?.sgstTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST:</span>
                    <span className="font-mono">{formatINR(pricing.taxBreakdown.sgstTotal)}</span>
                  </div>
                )}

                {pricing.taxBreakdown?.igstTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGST:</span>
                    <span className="font-mono">{formatINR(pricing.taxBreakdown.igstTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping Fee:</span>
                  <span className="font-mono">
                    {pricing.shippingFee > 0 ? formatINR(pricing.shippingFee) : "FREE"}
                  </span>
                </div>

                {pricing.codFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>COD Collection Fee:</span>
                    <span className="font-mono">{formatINR(pricing.codFee)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold border-t pt-2.5 text-foreground">
                  <span>Grand Total (INR):</span>
                  <span className="font-mono text-base text-primary">
                    {formatINR(pricing.grandTotal || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chronological Lifecycle Timeline */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Order Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {(order.timeline || []).map((t, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-background bg-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{t.title}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {t.timestamp ? formatDate(t.timestamp) : ""} •{" "}
                          {t.timestamp
                            ? new Date(t.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                        Actor: {t.actorEmail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Staff Internal Notes Thread */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Internal Staff Notes ({order.adminNotes?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add an internal operational note regarding this order..."
                  rows={2}
                  className="w-full p-2.5 rounded-md border text-xs bg-background resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newNote.trim() || addingNote}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Send className="h-3 w-3" />
                    {addingNote ? "Adding..." : "Post Note"}
                  </Button>
                </div>
              </form>

              <div className="space-y-2.5 pt-2">
                {(order.adminNotes || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-2">
                    No internal notes posted yet.
                  </p>
                ) : (
                  order.adminNotes.map((n, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{n.authorEmail}</span>
                        <span>{n.createdAt ? formatDate(n.createdAt) : ""}</span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{n.note}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (Customer, Addresses, Payment, Logistics, Warehouse) */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Customer Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <div>
                <span className="text-muted-foreground block text-[11px]">Full Name</span>
                <span className="font-semibold text-foreground text-sm">
                  {order.customerDetails?.name || "Guest Customer"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Email Address</span>
                <a
                  href={`mailto:${order.customerDetails?.email}`}
                  className="text-primary hover:underline font-mono"
                >
                  {order.customerDetails?.email}
                </a>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                <span className="font-mono text-foreground">
                  {order.customerDetails?.phone || "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery & Shipping Address Card */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Shipping Destination
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-1.5 leading-relaxed">
              <p className="font-semibold text-foreground">{shipping.fullName}</p>
              <p className="text-muted-foreground">{shipping.addressLine1}</p>
              {shipping.addressLine2 && (
                <p className="text-muted-foreground">{shipping.addressLine2}</p>
              )}
              {shipping.landmark && (
                <p className="text-muted-foreground">Landmark: {shipping.landmark}</p>
              )}
              <p className="font-medium text-foreground">
                {shipping.city}, {shipping.state} — {shipping.pinCode}
              </p>
              <p className="text-muted-foreground">India</p>
              <p className="text-muted-foreground pt-1">Phone: {shipping.phone}</p>
            </CardContent>
          </Card>

          {/* Payment Details Card */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment & Billing
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-semibold uppercase text-foreground">{payment.method}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Status:</span>
                <Badge
                  variant="outline"
                  className={
                    payment.status === "PAID" || payment.status === "CAPTURED"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : payment.status === "REFUNDED"
                      ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }
                >
                  {payment.status}
                </Badge>
              </div>
              {payment.transactionId && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-[11px] text-foreground">
                    {payment.transactionId}
                  </span>
                </div>
              )}
              {payment.paidAt && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Paid At:</span>
                  <span>{formatDate(payment.paidAt)}</span>
                </div>
              )}
              {billing.gstin && (
                <div className="flex justify-between items-center pt-1 border-t">
                  <span className="text-muted-foreground">Customer GSTIN:</span>
                  <span className="font-mono font-semibold">{billing.gstin}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fulfillment & Courier Card */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Logistics & Dispatch
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Carrier:</span>
                <span className="font-semibold text-foreground">
                  {fulfillment.carrier || "Unassigned"}
                </span>
              </div>
              {fulfillment.awbNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">AWB Number:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {fulfillment.awbNumber}
                  </span>
                </div>
              )}
              {fulfillment.trackingUrl && (
                <div className="pt-1">
                  <a
                    href={fulfillment.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Track Package via Courier
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {fulfillment.shippedAt && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Dispatched At:</span>
                  <span>{formatDate(fulfillment.shippedAt)}</span>
                </div>
              )}
              {fulfillment.deliveredAt && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Delivered At:</span>
                  <span className="text-emerald-600 font-medium">
                    {formatDate(fulfillment.deliveredAt)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Real-time Inventory Impact Card */}
          <Card>
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                Warehouse Inventory Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Stock Reservation:</span>
                <Badge
                  variant="outline"
                  className={
                    invState.reserved
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {invState.reserved ? "RESERVED" : "NOT RESERVED"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fulfillment Commitment:</span>
                <Badge
                  variant="outline"
                  className={
                    invState.committed
                      ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {invState.committed ? "DEDUCTED (DISPATCHED)" : "PENDING DISPATCH"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cancellation Release:</span>
                <Badge
                  variant="outline"
                  className={
                    invState.released
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {invState.released ? "RELEASED TO STOCK" : "N/A"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Return Restocked:</span>
                <Badge
                  variant="outline"
                  className={
                    invState.restocked
                      ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {invState.restocked ? "RESTOCKED" : "N/A"}
                </Badge>
              </div>

              <p className="text-[11px] text-muted-foreground pt-1 border-t">
                ℹ️ Double-entry inventory transactions are recorded in the Inventory ledger for each
                stage of this order.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Dialogs */}
      <OrderStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        order={order}
        onStatusUpdated={setOrder}
      />

      <OrderCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        order={order}
        onOrderCancelled={setOrder}
      />

      <OrderReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        order={order}
        onReturnProcessed={setOrder}
      />

      <OrderRefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        order={order}
        onRefundIssued={setOrder}
      />

      <OrderInvoiceDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        order={order}
      />
    </div>
  );
}
