"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserPlus,
  IndianRupee,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Download,
} from "lucide-react";
import { formatINR, formatDate } from "@/lib/formatters";
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
import { CustomerDialog } from "./customer-dialog";
import { CustomerStatusDialog } from "./customer-status-dialog";
import { toast } from "sonner";

export function CustomersListView() {
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    inactiveCustomers: 0,
    blockedCustomers: 0,
    newLast30Days: 0,
    totalOrders: 0,
    totalSpend: 0,
    totalCustomerSpend: 0,
    averageOrderValue: 0,
    itemsPurchased: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [behaviorFilter, setBehaviorFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      });

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (behaviorFilter !== "ALL") params.set("behavior", behaviorFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load customers");
      }

      setCustomers(data.customers || data.data?.customers || []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
      const rawMetrics = data.metrics || data.data?.metrics;
      if (rawMetrics && typeof rawMetrics === "object") {
        setMetrics({
          totalCustomers: Number(rawMetrics.totalCustomers ?? 0),
          activeCustomers: Number(rawMetrics.activeCustomers ?? 0),
          inactiveCustomers: Number(rawMetrics.inactiveCustomers ?? 0),
          blockedCustomers: Number(rawMetrics.blockedCustomers ?? 0),
          newLast30Days: Number(rawMetrics.newLast30Days ?? 0),
          totalOrders: Number(rawMetrics.totalOrders ?? 0),
          totalSpend: Number(rawMetrics.totalSpend ?? rawMetrics.totalCustomerSpend ?? rawMetrics.totalLtv ?? 0),
          totalCustomerSpend: Number(rawMetrics.totalCustomerSpend ?? rawMetrics.totalSpend ?? rawMetrics.totalLtv ?? 0),
          averageOrderValue: Number(rawMetrics.averageOrderValue ?? 0),
          itemsPurchased: Number(rawMetrics.itemsPurchased ?? 0),
        });
      }
    } catch (err) {
      console.error("Fetch customers error:", err);
      toast.error(err.message || "Error loading customers");
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, search, statusFilter, behaviorFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const openCreateDialog = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const openEditDialog = (customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const openStatusDialog = (customer) => {
    setSelectedCustomer(customer);
    setStatusDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/80">
            Active
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/80">
            Inactive
          </Badge>
        );
      case "BLOCKED":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/80">
            Blocked
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name, firstName, lastName) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    const f = firstName ? firstName[0] : "";
    const l = lastName ? lastName[0] : "";
    return (f + l).toUpperCase() || "C";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers CRM"
        description="Comprehensive customer database, lifetime value metrics, purchasing behavior cohorts, and address profiles."
        badge={
          <Badge variant="outline" className="text-slate-600 bg-white">
            {totalCount} Total Registered
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/api/customers/export", "_blank")}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchCustomers()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreateDialog} className="bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Customer
            </Button>
          </div>
        }
      />

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {(metrics?.totalCustomers ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Database profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Active Accounts</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {(metrics?.activeCustomers ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">In good standing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">New (Last 30 Days)</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(metrics?.newLast30Days ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Recent signups / buyers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Cumulative Spend (LTV)</CardTitle>
            <IndianRupee className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(metrics?.totalSpend ?? metrics?.totalCustomerSpend ?? 0, false)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Across all fulfilled orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </form>

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
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Behavior Cohort Filter */}
              <div className="w-[160px]">
                <Select
                  value={behaviorFilter}
                  onValueChange={(val) => {
                    setBehaviorFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Cohorts</SelectItem>
                    <SelectItem value="FIRST_TIME">First-Time (1 order)</SelectItem>
                    <SelectItem value="REPEAT">Repeat Buyers (2+)</SelectItem>
                    <SelectItem value="HIGH_VALUE">High Value (VIP)</SelectItem>
                    <SelectItem value="INACTIVE">Inactive (0 orders)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort selector */}
              <div className="w-[160px]">
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={(val) => {
                    const [field, order] = val.split("-");
                    setSortBy(field);
                    setSortOrder(order);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                    <SelectItem value="firstName-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="firstName-desc">Name (Z-A)</SelectItem>
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
                  <TableHead className="w-[280px]">Customer</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[90px]">Orders</TableHead>
                  <TableHead className="text-right w-[120px]">Total Spent</TableHead>
                  <TableHead className="text-right w-[110px]">AOV</TableHead>
                  <TableHead className="w-[130px]">Last Order</TableHead>
                  <TableHead className="w-[130px]">Joined</TableHead>
                  <TableHead className="text-right w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="text-xs">Loading customer directory...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                        <Users className="h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-700">No customers found</p>
                        <p className="text-xs text-slate-400">
                          Try adjusting your search criteria or filter options.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => {
                    const customerMetrics = c.purchasingMetrics || c.metrics || {};
                    const displayName = c.name || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Customer";
                    return (
                      <TableRow key={c._id} className="hover:bg-slate-50/70 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
                              {getInitials(c.name, c.firstName, c.lastName)}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/customers/${c._id}`}
                                className="text-xs font-semibold text-slate-900 hover:text-blue-600 truncate block"
                              >
                                {displayName}
                              </Link>
                              <p className="text-[11px] text-slate-500 truncate">{c.email}</p>
                              {c.phone && (
                                <p className="text-[10px] text-slate-400 truncate">{c.phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(c.status)}</TableCell>

                        <TableCell className="text-right">
                          <span className="inline-flex items-center justify-center font-medium text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                            {customerMetrics.totalOrders ?? 0}
                          </span>
                        </TableCell>

                        <TableCell className="text-right font-medium text-xs text-slate-900">
                          {formatINR(customerMetrics.totalSpend ?? 0)}
                        </TableCell>

                        <TableCell className="text-right text-xs text-slate-600">
                          {formatINR(customerMetrics.averageOrderValue ?? customerMetrics.avgOrderValue ?? 0)}
                        </TableCell>

                        <TableCell className="text-xs text-slate-600">
                          {customerMetrics.lastOrderDate ? formatDate(customerMetrics.lastOrderDate, { shortMonth: true }) : "Never"}
                        </TableCell>

                        <TableCell className="text-xs text-slate-500">
                          {formatDate(c.createdAt, { shortMonth: true })}
                        </TableCell>

                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs">Customer Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/customers/${c._id}`} className="cursor-pointer">
                                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-500" />
                                  View 360° Profile
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(c)} className="cursor-pointer">
                                <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-500" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openStatusDialog(c)} className="cursor-pointer">
                                <ShieldAlert className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                Change Account Status
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
              <span>Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(val) => {
                  setLimit(Number(val));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>
                Showing {customers.length > 0 ? (page - 1) * limit + 1 : 0} -{" "}
                {Math.min(page * limit, totalCount)} of {totalCount}
              </span>
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
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSuccess={() => fetchCustomers()}
      />

      <CustomerStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        customer={selectedCustomer}
        onSuccess={() => fetchCustomers()}
      />
    </div>
  );
}
