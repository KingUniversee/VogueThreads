"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  IndianRupee,
  ShoppingBag,
  Percent,
  RotateCcw,
  Truck,
  Receipt,
  Sparkles,
  CreditCard,
  Layers,
} from "lucide-react";
import { formatINR, formatNumberIN } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsDatePicker } from "./analytics-date-picker";
import { AnalyticsAreaChart } from "./analytics-area-chart";

const ANALYTICS_NAV = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/sales", label: "Sales", active: true },
  { href: "/analytics/products", label: "Products" },
  { href: "/analytics/customers", label: "Customers" },
  { href: "/analytics/conversion", label: "Conversion" },
];

export function SalesAnalyticsView() {
  const [range, setRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (r, start, end) => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/analytics/sales?range=${r}`;
      if (r === "custom" && start && end) {
        url += `&startDate=${start}&endDate=${end}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load sales analytics");
      }
      setData(json.data);
    } catch (err) {
      console.error("Sales analytics error:", err);
      setError(err.message || "Failed to load sales analytics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range, customStart, customEnd);
  }, [range, customStart, customEnd, fetchData]);

  const handleRangeChange = (newRange, start, end) => {
    setRange(newRange);
    if (start && end) {
      setCustomStart(start);
      setCustomEnd(end);
    }
  };

  const financials = data?.financials || {};
  const period = data?.period || {};
  const timeline = data?.timeline || [];
  const paymentChannels = data?.paymentChannels || [];
  const orderStatusBreakdown = data?.orderStatusBreakdown || [];

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Sales Analytics"
        description="GAAP-compliant financial sales auditing: gross sales, promotional discounts, returns, logistics fees, and realized net revenue."
      />

      {/* Sub-nav */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        {ANALYTICS_NAV.map((nav) => (
          <Link
            key={nav.href}
            href={nav.href}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              nav.active
                ? "bg-slate-900 text-white font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {nav.label}
          </Link>
        ))}
      </div>

      {/* Date Picker */}
      <AnalyticsDatePicker
        selectedRange={range}
        onRangeChange={handleRangeChange}
        startDate={customStart}
        endDate={customEnd}
        onRefresh={() => fetchData(range, customStart, customEnd)}
        isLoading={isLoading}
      />

      {period.label && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600">
          <span className="font-medium text-slate-800">
            Reporting Period: <span className="font-semibold">{period.label}</span>
          </span>
          <span className="text-[11px] text-slate-500">Excludes cancelled and failed orders</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <strong>Error loading sales data:</strong> {error}
        </div>
      )}

      {/* Financial Accounting Breakdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Gross Sales</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(financials.grossSales || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Total catalog merchandise value</p>
          </CardContent>
        </Card>

        {/* Discounts (-) */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Discounts Deducted</span>
              <div className="p-2 bg-amber-50 rounded-md text-amber-700">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 tracking-tight">
              - {formatINR(financials.discounts || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Coupons and promotional discounts</p>
          </CardContent>
        </Card>

        {/* Refunds (-) */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Returns & Refunds</span>
              <div className="p-2 bg-rose-50 rounded-md text-rose-700">
                <RotateCcw className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 tracking-tight">
              - {formatINR(financials.refunds || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Customer returns processed</p>
          </CardContent>
        </Card>

        {/* Net Sales */}
        <Card className="border-slate-900 bg-slate-900 text-white shadow-md">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Net Sales Realized</span>
              <div className="p-2 bg-slate-800 rounded-md text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {formatINR(financials.netSales || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Gross - Discounts - Refunds</p>
          </CardContent>
        </Card>

        {/* Shipping Collected */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Shipping Fees Collected</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(financials.shippingFees || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Customer logistics charges</p>
          </CardContent>
        </Card>

        {/* Taxes Collected */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">GST / Taxes Collected</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(financials.taxes || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Remitted sales tax</p>
          </CardContent>
        </Card>

        {/* Valid Orders */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Valid Sales Orders</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatNumberIN(financials.ordersCount || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Non-cancelled orders</p>
          </CardContent>
        </Card>

        {/* Average Net Order Value */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Avg Net Order Value</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(financials.averageNetOrderValue || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Net Sales / Valid Orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily / Timeline Area Chart */}
      <AnalyticsAreaChart
        points={timeline}
        title="Net Sales Realization Timeline"
        subtitle="Chronological net sales realization after discount and return deductions"
        primaryKey="netSales"
        primaryLabel="Net Sales"
        secondaryKey="ordersCount"
        secondaryLabel="Orders"
        accentColor="#059669"
        fillGradientStart="#10b981"
        fillGradientEnd="#a7f3d0"
      />

      {/* Payment Channels & Order Status Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Channels Table */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-600" />
                Payment Gateway Settlement
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Channel</TableHead>
                  <TableHead className="text-xs text-right">Orders</TableHead>
                  <TableHead className="text-xs text-right">Gross Sales</TableHead>
                  <TableHead className="text-xs text-right">Net Sales</TableHead>
                  <TableHead className="text-xs text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentChannels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-xs text-slate-400">
                      No payment settlements recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentChannels.map((pc) => (
                    <TableRow key={pc.channel}>
                      <TableCell className="text-xs font-semibold text-slate-800 uppercase">
                        {pc.channel === "COD" ? "Cash on Delivery" : pc.channel}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-slate-600">
                        {formatNumberIN(pc.ordersCount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-slate-600">
                        {formatINR(pc.grossAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-medium text-slate-900">
                        {formatINR(pc.netAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {pc.sharePercent}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Order Fulfillment Status Breakdown */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-600" />
                Orders by Commercial Status
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Order Count</TableHead>
                  <TableHead className="text-xs text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderStatusBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-xs text-slate-400">
                      No status records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  orderStatusBreakdown.map((s) => (
                    <TableRow key={s.status}>
                      <TableCell className="text-xs">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-medium uppercase ${
                            s.status === "DELIVERED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : s.status === "RETURNED"
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-slate-700">
                        {formatNumberIN(s.count)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-medium text-slate-900">
                        {formatINR(s.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
