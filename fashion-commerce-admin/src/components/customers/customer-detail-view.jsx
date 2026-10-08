"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Clock,
  MapPin,
  Tag,
  ShieldAlert,
  Edit2,
  Plus,
  FileText,
  UserCheck,
  UserX,
  ExternalLink,
  RefreshCw,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { formatINR, formatDate } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { CustomerDialog } from "./customer-dialog";
import { CustomerStatusDialog } from "./customer-status-dialog";
import { CustomerAddressDialog } from "./customer-address-dialog";
import { toast } from "sonner";

export function CustomerDetailView({ customerId }) {
  const [customer, setCustomer] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [activeSegments, setActiveSegments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);

  // Note form state
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchCustomerDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load customer profile");
      }
      setCustomer(data.customer);
      setMetrics(data.metrics);
      setActiveSegments(data.activeSegments || []);
    } catch (err) {
      console.error("Load customer error:", err);
      toast.error(err.message || "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const fetchCustomerOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/orders?limit=25`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Load customer orders error:", err);
    } finally {
      setOrdersLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerDetails();
    fetchCustomerOrders();
  }, [fetchCustomerDetails, fetchCustomerOrders]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to add note");
      }
      toast.success("Internal note added");
      setNewNote("");
      // Refresh customer data to get the updated notes
      fetchCustomerDetails();
    } catch (err) {
      console.error("Add note error:", err);
      toast.error(err.message || "Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Active Account
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            Inactive Account
          </Badge>
        );
      case "BLOCKED":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200">
            Blocked
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrderStatusBadge = (status) => {
    const map = {
      DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      SHIPPED: "bg-blue-50 text-blue-700 border-blue-200",
      PROCESSING: "bg-indigo-50 text-indigo-700 border-indigo-200",
      PACKED: "bg-purple-50 text-purple-700 border-purple-200",
      CONFIRMED: "bg-cyan-50 text-cyan-700 border-cyan-200",
      PENDING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200",
      CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
      RETURNED: "bg-orange-50 text-orange-700 border-orange-200",
      REFUNDED: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <Badge className={map[status] || "bg-slate-100 text-slate-700"}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          <p className="text-xs text-slate-500">Loading customer profile...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-slate-600">Customer not found or was removed.</p>
        <Button asChild variant="outline">
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Customers
          </Link>
        </Button>
      </div>
    );
  }

  const displayName =
    customer.name ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    "Customer";

  const getInitials = (name) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return "C";
  };

  const initials = getInitials(displayName);

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5">
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" /> Back to Customers
            </Link>
          </Button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-medium text-slate-600">Customer #{customer._id.slice(-6)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)}>
            <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-amber-600" /> Change Status
          </Button>
        </div>
      </div>

      {/* Customer Header Card */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-lg font-bold text-white shadow-sm">
                {initials}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-bold text-slate-900">{displayName}</h1>
                  {getStatusBadge(customer.status)}
                  {customer.acceptsMarketing && (
                    <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                      Marketing Subscribed
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {customer.email}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" /> {customer.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Member since{" "}
                    {formatDate(customer.createdAt, { shortMonth: true })}
                  </span>
                </div>

                {customer.tags && customer.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    {customer.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        <Tag className="h-2.5 w-2.5 text-slate-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchasing Metrics Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Lifetime Value (LTV)</CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(metrics?.totalSpend || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Fulfilled & active orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Total Orders Placed</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {metrics?.totalOrders || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Valid historical purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(metrics?.averageOrderValue || 0)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Spend per valid checkout</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Last Order Date</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900 mt-0.5 truncate">
              {metrics?.lastOrderDate
                ? formatDate(metrics.lastOrderDate, { shortMonth: true })
                : "No Orders Yet"}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {metrics?.daysSinceLastOrder !== null
                ? `${metrics.daysSinceLastOrder} days ago`
                : "New customer"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="orders" className="text-xs gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> Order History ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="addresses" className="text-xs gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Saved Addresses ({customer.addresses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="segments" className="text-xs gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Active Segments ({activeSegments.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Internal Notes ({customer.adminNotes?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Orders */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Purchasing History
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Immutable record of all orders placed by {customer.email}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[140px]">Order #</TableHead>
                      <TableHead className="w-[130px]">Date</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[120px]">Payment</TableHead>
                      <TableHead className="text-center w-[90px]">Items</TableHead>
                      <TableHead className="text-right w-[120px]">Total Amount</TableHead>
                      <TableHead className="text-right w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-500">
                          <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-slate-400" />
                          Loading orders...
                        </TableCell>
                      </TableRow>
                    ) : orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-500">
                          No order history found for this customer.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((o) => (
                        <TableRow key={o._id} className="hover:bg-slate-50/70">
                          <TableCell className="font-semibold text-xs text-slate-900">
                            {o.orderNumber}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {formatDate(o.createdAt, { shortMonth: true })}
                          </TableCell>
                          <TableCell>{getOrderStatusBadge(o.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px]">
                              {o.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs text-slate-700">
                            {o.items?.length || 0}
                          </TableCell>
                          <TableCell className="text-right font-medium text-xs text-slate-900">
                            {formatINR(o.pricing?.grandTotal || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link href={`/orders/${o._id}`}>
                                View <ExternalLink className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Addresses */}
        <TabsContent value="addresses" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Saved addresses for checkout, delivery, and invoicing.
            </p>
            <Button size="sm" onClick={() => setAddressDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Address
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(!customer.addresses || customer.addresses.length === 0) ? (
              <Card className="col-span-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <MapPin className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No addresses saved yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click &quot;Add Address&quot; to store shipping and billing locations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              customer.addresses.map((addr, idx) => (
                <Card key={idx} className={`relative ${addr.isDefault ? "border-slate-900 shadow-sm" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-slate-900">
                        {addr.name}
                      </CardTitle>
                      <div className="flex items-center gap-1.5">
                        {addr.isDefault && (
                          <Badge className="bg-slate-900 text-white text-[10px] py-0">Default</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] py-0">
                          {addr.type}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-slate-600">
                    <p>{addr.addressLine1}</p>
                    {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                    <p>
                      {addr.city}, {addr.state} - {addr.postalCode}
                    </p>
                    <p className="text-slate-500">{addr.country || "India"}</p>
                    <p className="pt-2 text-slate-500 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /> {addr.phone}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Active Segments */}
        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Segment Memberships
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Cohorts and behavioral segments that currently match this customer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSegments.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  This customer is not currently part of any segment.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeSegments.map((seg) => (
                    <div key={seg._id} className="py-3 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900">{seg.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              seg.type === "RULE_BASED"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                          >
                            {seg.type === "RULE_BASED" ? "Dynamic Rule-Based" : "Manual Cohort"}
                          </Badge>
                        </div>
                        {seg.description && (
                          <p className="text-[11px] text-slate-500">{seg.description}</p>
                        )}
                      </div>
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link href={`/customers/segments/${seg._id}`}>
                          View Segment <ExternalLink className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Internal Notes */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Staff & Admin Notes
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Internal log visible only to admin operators. Customer will never see these notes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2">
                <Textarea
                  placeholder="Add internal comment, customer support observation, or call log..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="text-xs resize-none"
                  rows={3}
                  disabled={submittingNote}
                />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={submittingNote || !newNote.trim()}>
                    {submittingNote ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Post Note
                  </Button>
                </div>
              </form>

              {/* Notes Timeline */}
              <div className="pt-2 border-t border-slate-100">
                {(!customer.adminNotes || customer.adminNotes.length === 0) ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No internal notes recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...customer.adminNotes].reverse().map((n, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs">
                        <div className="flex items-center justify-between text-slate-500 mb-1">
                          <span className="font-semibold text-slate-800">{n.authorEmail}</span>
                          <span className="text-[11px]">{formatDate(n.createdAt, { includeTime: true })}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CustomerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={customer}
        onSuccess={() => fetchCustomerDetails()}
      />

      <CustomerStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        customer={customer}
        onSuccess={() => fetchCustomerDetails()}
      />

      <CustomerAddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        customerId={customer._id}
        onSuccess={() => fetchCustomerDetails()}
      />
    </div>
  );
}
