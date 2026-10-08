"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  IndianRupee,
  Users,
  Percent,
  RotateCcw,
  Boxes,
  CreditCard,
  Layers,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { formatINR, formatNumberIN, formatPercent } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsDatePicker } from "./analytics-date-picker";
import { AnalyticsAreaChart } from "./analytics-area-chart";

const ANALYTICS_NAV = [
  { href: "/analytics", label: "Overview", active: true },
  { href: "/analytics/sales", label: "Sales" },
  { href: "/analytics/products", label: "Products" },
  { href: "/analytics/customers", label: "Customers" },
  { href: "/analytics/conversion", label: "Conversion" },
];

export function AnalyticsOverviewView() {
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
      let url = `/api/analytics/overview?range=${r}`;
      if (r === "custom" && start && end) {
        url += `&startDate=${start}&endDate=${end}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load overview analytics");
      }
      setData(json.data);
    } catch (err) {
      console.error("Overview analytics error:", err);
      setError(err.message || "Failed to load analytics");
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

  const kpis = data?.kpis || {};
  const period = data?.period || {};
  const trendPoints = data?.trend?.points || [];
  const paymentMethods = data?.paymentMethods || [];
  const categories = data?.categories || [];

  return (
    <div className="space-y-6 antialiased">
      {/* Top Header */}
      <PageHeader
        title="Analytics Overview"
        description="Comprehensive commercial KPIs, real-time revenue velocity, and comparative period trends across VogueThreads."
      />

      {/* Sub-nav Tabs */}
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

      {/* Date Picker Toolbar */}
      <AnalyticsDatePicker
        selectedRange={range}
        onRangeChange={handleRangeChange}
        startDate={customStart}
        endDate={customEnd}
        onRefresh={() => fetchData(range, customStart, customEnd)}
        isLoading={isLoading}
      />

      {/* Period Description Banner */}
      {period.label && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600">
          <span className="font-medium text-slate-800">
            Active Period: <span className="font-semibold">{period.label}</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Comparative percentage changes calculated against preceding {range} interval
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <strong>Error loading analytics:</strong> {error}
        </div>
      )}

      {/* 8 Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <KpiCard
          title="Gross Revenue"
          value={formatINR(kpis.grossRevenue?.value || 0)}
          change={kpis.grossRevenue?.changePercent}
          isPositive={kpis.grossRevenue?.isPositive}
          icon={IndianRupee}
          subtitle={`Prev: ${formatINR(kpis.grossRevenue?.previousValue || 0)}`}
        />

        {/* Net Revenue */}
        <KpiCard
          title="Net Revenue"
          value={formatINR(kpis.netRevenue?.value || 0)}
          change={kpis.netRevenue?.changePercent}
          isPositive={kpis.netRevenue?.isPositive}
          icon={Sparkles}
          subtitle={`Prev: ${formatINR(kpis.netRevenue?.previousValue || 0)}`}
        />

        {/* Orders Placed */}
        <KpiCard
          title="Total Orders"
          value={formatNumberIN(kpis.ordersCount?.value || 0)}
          change={kpis.ordersCount?.changePercent}
          isPositive={kpis.ordersCount?.isPositive}
          icon={ShoppingBag}
          subtitle={`Prev: ${formatNumberIN(kpis.ordersCount?.previousValue || 0)} orders`}
        />

        {/* Average Order Value (AOV) */}
        <KpiCard
          title="Average Order Value"
          value={formatINR(kpis.aov?.value || 0)}
          change={kpis.aov?.changePercent}
          isPositive={kpis.aov?.isPositive}
          icon={Percent}
          subtitle={`Prev: ${formatINR(kpis.aov?.previousValue || 0)}`}
        />

        {/* Units Sold */}
        <KpiCard
          title="Units Sold"
          value={formatNumberIN(kpis.unitsSold?.value || 0)}
          change={kpis.unitsSold?.changePercent}
          isPositive={kpis.unitsSold?.isPositive}
          icon={Boxes}
          subtitle={`Prev: ${formatNumberIN(kpis.unitsSold?.previousValue || 0)} units`}
        />

        {/* Unique Buyers */}
        <KpiCard
          title="Unique Buyers"
          value={formatNumberIN(kpis.customersCount?.value || 0)}
          change={kpis.customersCount?.changePercent}
          isPositive={kpis.customersCount?.isPositive}
          icon={Users}
          subtitle={`Prev: ${formatNumberIN(kpis.customersCount?.previousValue || 0)} customers`}
        />

        {/* Discounts Granted */}
        <KpiCard
          title="Discounts Applied"
          value={formatINR(kpis.discounts?.value || 0)}
          icon={Percent}
          subtitle={`${formatNumberIN(kpis.discounts?.count || 0)} orders with discounts`}
        />

        {/* Refunds Issued */}
        <KpiCard
          title="Refunds Processed"
          value={formatINR(kpis.refunds?.value || 0)}
          icon={RotateCcw}
          subtitle={`${formatNumberIN(kpis.refunds?.count || 0)} orders returned/refunded`}
        />
      </div>

      {/* Main Revenue & Volume Trend Chart */}
      <AnalyticsAreaChart
        points={trendPoints}
        title="Revenue & Order Velocity Timeline"
        subtitle={`Chronological breakdown (${period.interval || "day"} grouping) based on verified MongoDB orders`}
        primaryKey="revenue"
        primaryLabel="Revenue"
        secondaryKey="orders"
        secondaryLabel="Orders"
        accentColor="#0f172a"
        fillGradientStart="#0284c7"
        fillGradientEnd="#bae6fd"
      />

      {/* Distribution Grids: Payment Methods & Category Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Channels */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-600" />
                Payment Method Share
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
                {paymentMethods.length} Methods Recorded
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {paymentMethods.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No payment transactions in this interval.</p>
            ) : (
              paymentMethods.map((pm) => (
                <div key={pm.method} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 uppercase tracking-wide">
                      {pm.method === "COD" ? "Cash on Delivery" : pm.method}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{formatINR(pm.amount)}</span>
                      <span className="text-slate-400">({pm.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, pm.percentage))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{formatNumberIN(pm.count)} orders</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Category Contribution */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-600" />
                Category Performance
              </CardTitle>
              <Link
                href="/analytics/products"
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                Detailed Products <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3.5">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No category sales recorded in this interval.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{cat.category}</span>
                    <span className="font-semibold text-slate-900">{formatINR(cat.revenue)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{formatNumberIN(cat.units)} items sold</span>
                    <span>{formatNumberIN(cat.count)} orders</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ title, value, change, isPositive, icon: Icon, subtitle }) {
  const hasChange = typeof change === "number";

  return (
    <Card className="hover:border-slate-300 transition-colors">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">{title}</span>
          <div className="p-2 bg-slate-100 rounded-md text-slate-700">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
        <div className="mt-2 flex items-center justify-between text-xs">
          {hasChange ? (
            <span
              className={`inline-flex items-center gap-1 font-semibold text-[11px] px-1.5 py-0.5 rounded ${
                isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercent(Math.abs(change))}
            </span>
          ) : (
            <span className="text-slate-400 text-[11px]">—</span>
          )}
          {subtitle && <span className="text-[11px] text-slate-500 truncate max-w-[140px]">{subtitle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
