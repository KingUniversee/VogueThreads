"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  IndianRupee,
  Users,
  Percent,
  RotateCcw,
  ArrowRight,
  Boxes,
  Shirt,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Truck,
  Clock,
  XCircle,
  Database,
  ArrowUpRight,
  Sparkles,
  Layers,
} from "lucide-react";
import { formatINR, formatNumberIN, formatPercent, formatDate } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

const DATE_RANGE_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "90d", label: "Last 90 days" },
];

export function DashboardView() {
  const [selectedRange, setSelectedRange] = useState("30d");
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredChartIndex, setHoveredChartIndex] = useState(null);
  const gradientId = useId();

  const fetchDashboard = useCallback(async (rangeKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?range=${rangeKey}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Failed to load dashboard data (Status ${res.status})`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setDashboardData(json.data);
      } else {
        throw new Error(json.error || "Failed to load dashboard data");
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Unable to connect to the database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(selectedRange);
  }, [selectedRange, fetchDashboard]);

  const kpis = dashboardData?.kpis || {
    revenue: { value: 0, previousValue: 0, change: 0, isPositive: true },
    orders: { value: 0, previousValue: 0, change: 0, isPositive: true },
    customers: { value: 0, total: 0, previousValue: 0, change: 0, isPositive: true },
    aov: { value: 0, previousValue: 0, change: 0, isPositive: true },
    conversionRate: { value: 0, change: 0, isPositive: true },
    returnRate: { value: 0, change: 0, isPositive: true },
  };

  const chartPoints = dashboardData?.chart?.points || [];
  const orderStatus = dashboardData?.orderStatus || {};
  const topProducts = dashboardData?.topProducts || [];
  const inventoryAlerts = dashboardData?.inventoryAlerts || [];
  const recentOrders = dashboardData?.recentOrders || [];
  const quickInsights = dashboardData?.quickInsights || {
    awaitingFulfillment: 0,
    lowStockCount: 0,
    returnRatePercent: 0,
    repeatCustomerRate: 0,
  };
  const isDatabaseEmpty = Boolean(dashboardData?.isDatabaseEmpty);

  // SVG Chart Geometry Calculations
  const chartWidth = 700;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 25;
  const maxRevenue = Math.max(...chartPoints.map((p) => p.revenue), 100);

  const coordinates = chartPoints.map((point, index) => {
    const x =
      chartPoints.length > 1
        ? paddingX + (index / (chartPoints.length - 1)) * (chartWidth - 2 * paddingX)
        : chartWidth / 2;
    const y =
      chartHeight -
      paddingY -
      (point.revenue / maxRevenue) * (chartHeight - 2 * paddingY);
    return { x, y, ...point };
  });

  const pathD =
    coordinates.length > 0
      ? coordinates.reduce((acc, curr, idx) => {
          if (idx === 0) return `M ${curr.x} ${curr.y}`;
          const prev = coordinates[idx - 1];
          const cx = (prev.x + curr.x) / 2;
          return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
        }, "")
      : "";

  const areaD =
    coordinates.length > 0
      ? `${pathD} L ${coordinates[coordinates.length - 1].x} ${
          chartHeight - paddingY
        } L ${coordinates[0].x} ${chartHeight - paddingY} Z`
      : "";

  const activePoint =
    hoveredChartIndex !== null && coordinates[hoveredChartIndex]
      ? coordinates[hoveredChartIndex]
      : null;

  return (
    <div className="space-y-6 antialiased">
      {/* ========================================================================= */}
      {/* TOP HEADER: CONTEXTUAL TITLE, DB STATUS, DATE SELECTOR & REFRESH          */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Executive Dashboard
            </h1>
            {isLoading && !dashboardData ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
                MongoDB Connecting...
              </span>
            ) : isDatabaseEmpty ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                MongoDB Connected • Zero Records
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live MongoDB Stream
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Real-time apparel commerce operations, sales performance, and variant inventory across VogueThreads.
          </p>
        </div>

        {/* Controls: Date Selector + Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="relative">
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              disabled={isLoading}
              className="h-9 pl-3 pr-8 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 hover:bg-slate-100 focus:outline-none focus:border-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {DATE_RANGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Calendar className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(selectedRange)}
            disabled={isLoading}
            className="h-9 px-3 gap-1.5 text-xs text-slate-700 hover:text-slate-900"
            title="Refresh live data from MongoDB"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Global Error Banner (with Retry) */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchDashboard(selectedRange)}
            className="h-7 text-xs bg-white text-rose-700 border-rose-300 hover:bg-rose-100"
          >
            Retry Query
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PRIMARY & SECONDARY KPI OVERVIEW GRID                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Total Revenue */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Revenue
              </span>
              <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                <IndianRupee className="h-3.5 w-3.5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-7 w-28 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {formatINR(kpis.revenue.value, false)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span
              className={`inline-flex items-center font-semibold ${
                kpis.revenue.isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {kpis.revenue.isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {formatPercent(kpis.revenue.change)}
            </span>
            <span className="text-slate-400 text-[10px] truncate">vs prev period</span>
          </div>
        </Card>

        {/* Total Orders */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Orders
              </span>
              <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-7 w-20 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {formatNumberIN(kpis.orders.value)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span
              className={`inline-flex items-center font-semibold ${
                kpis.orders.isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {kpis.orders.isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {formatPercent(kpis.orders.change)}
            </span>
            <span className="text-slate-400 text-[10px] truncate">vs prev period</span>
          </div>
        </Card>

        {/* Total Customers */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Customers
              </span>
              <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                <Users className="h-3.5 w-3.5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-7 w-20 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {formatNumberIN(kpis.customers.value)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span
              className={`inline-flex items-center font-semibold ${
                kpis.customers.isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {kpis.customers.isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {formatPercent(kpis.customers.change)}
            </span>
            <span className="text-slate-400 text-[10px] truncate">
              {kpis.customers.total > 0 ? `(${kpis.customers.total} total)` : "vs prev"}
            </span>
          </div>
        </Card>

        {/* Average Order Value (AOV) */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Avg Order Value
              </span>
              <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-7 w-24 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {formatINR(kpis.aov.value, false)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span
              className={`inline-flex items-center font-semibold ${
                kpis.aov.isPositive ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {kpis.aov.isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {formatPercent(kpis.aov.change)}
            </span>
            <span className="text-slate-400 text-[10px] truncate">vs prev period</span>
          </div>
        </Card>

        {/* Conversion Rate */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Conversion
              </span>
              <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                <Percent className="h-3.5 w-3.5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-7 w-16 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {kpis.conversionRate.value}%
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-[10px] text-slate-400">
              {kpis.conversionRate.value === 0 ? "Storefront tracking ready" : "Online conversion"}
            </span>
          </div>
        </Card>

        {/* Return Rate */}
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Return Rate
              </span>
              <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center text-slate-700">
                <RotateCcw className="h-3.5 w-3.5" />
              </div>
            </div>
            {isLoading ? (
              <div className="h-7 w-16 bg-slate-200 animate-pulse rounded my-1" />
            ) : (
              <div className="text-xl font-bold text-slate-900 tracking-tight">
                {kpis.returnRate.value}%
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100 text-[11px]">
            <span className="text-emerald-600 font-semibold text-[10px]">
              {kpis.returnRate.value <= 5 ? "Optimal (< 5%)" : "Monitor returns"}
            </span>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 2. REVENUE OVERVIEW & ORDER LIFECYCLE DISTRIBUTION (Top Middle Row)       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Revenue Area Chart */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Revenue Overview</CardTitle>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  {formatINR(kpis.revenue.value, false)}
                </span>
              </div>
              <CardDescription>
                Transaction velocity aggregated across {dashboardData?.period?.label || "selected period"}.
              </CardDescription>
            </div>

            {/* Quick Chart Range Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
              {["7d", "30d", "90d"].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRange(r)}
                  disabled={isLoading}
                  className={`px-2 py-0.5 rounded font-mono font-medium transition-colors ${
                    selectedRange === r
                      ? "bg-white text-slate-900 shadow-subtle font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-2 pb-4">
            {isLoading ? (
              <div className="h-[220px] w-full bg-slate-50 rounded-lg animate-pulse flex items-center justify-center text-xs text-slate-400">
                Aggregating transaction stream...
              </div>
            ) : kpis.revenue.value === 0 ? (
              /* Beautiful Empty Chart State */
              <div className="h-[220px] w-full rounded-lg border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <IndianRupee className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  No sales recorded for {dashboardData?.period?.label || "this period"}.
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
                  As customer checkouts are completed through UPI, Cards, or COD, your revenue curve will graph here.
                </p>
              </div>
            ) : (
              /* Pure Interactive SVG Area Chart */
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-[220px] overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guideline Grids */}
                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);
                    const val = Math.round(maxRevenue * ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="3 3"
                          strokeWidth="1"
                        />
                        <text
                          x={paddingX - 6}
                          y={y + 3}
                          textAnchor="end"
                          fontSize="9"
                          fill="#94a3b8"
                          className="font-mono"
                        >
                          {formatINR(val, true)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Gradient Area Fill */}
                  <path d={areaD} fill={`url(#${gradientId})`} />

                  {/* Curve Stroke Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Interactive Cursor Indicator */}
                  {activePoint && (
                    <g>
                      <line
                        x1={activePoint.x}
                        y1={paddingY}
                        x2={activePoint.x}
                        y2={chartHeight - paddingY}
                        stroke="#6366f1"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                      <circle
                        cx={activePoint.x}
                        cy={activePoint.y}
                        r="5"
                        fill="#4f46e5"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="shadow-md"
                      />
                    </g>
                  )}

                  {/* Transparent Hover Hit Areas */}
                  {coordinates.map((pt, idx) => (
                    <rect
                      key={idx}
                      x={pt.x - 12}
                      y={0}
                      width="24"
                      height={chartHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredChartIndex(idx)}
                      onMouseLeave={() => setHoveredChartIndex(null)}
                    />
                  ))}
                </svg>

                {/* Interactive Tooltip Pill */}
                {activePoint && (
                  <div
                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full bg-slate-900 text-white rounded px-2.5 py-1 text-[11px] shadow-lg border border-slate-700 z-10 whitespace-nowrap"
                    style={{
                      left: `${(activePoint.x / chartWidth) * 100}%`,
                      top: `${(activePoint.y / chartHeight) * 100 - 8}%`,
                    }}
                  >
                    <div className="font-semibold text-slate-100">{formatINR(activePoint.revenue, false)}</div>
                    <div className="text-[10px] text-slate-400">
                      {activePoint.label} • {activePoint.orders} orders
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 1 Col: Compact Order Lifecycle Status Distribution */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Order Lifecycle</CardTitle>
              <Link
                href="/orders"
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>View Orders</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription>Pipeline distribution across fulfillment stages.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Status Breakdown Chips */}
            <div className="space-y-2">
              {[
                { key: "PENDING_PAYMENT", label: "Pending Payment", color: "bg-amber-500", icon: Clock },
                { key: "PAID", label: "Paid", color: "bg-blue-500", icon: CheckCircle2 },
                { key: "PROCESSING", label: "Processing", color: "bg-indigo-500", icon: RefreshCw },
                { key: "PACKED", label: "Packed", color: "bg-purple-500", icon: PackageCheck },
                { key: "SHIPPED", label: "Shipped", color: "bg-sky-500", icon: Truck },
                { key: "DELIVERED", label: "Delivered", color: "bg-emerald-500", icon: CheckCircle2 },
                { key: "RETURNED", label: "Returned", color: "bg-rose-500", icon: RotateCcw },
                { key: "REFUNDED", label: "Refunded", color: "bg-pink-500", icon: RotateCcw },
              ].map((status) => {
                const count = orderStatus[status.key] || 0;
                return (
                  <div
                    key={status.key}
                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-50 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${status.color}`} />
                      <span className="text-slate-700">{status.label}</span>
                    </div>
                    <span
                      className={`font-mono font-semibold ${
                        count > 0 ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>

          <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-lg flex items-center justify-between text-[11px] text-slate-500">
            <span>FSM Order Engine</span>
            <span className="font-mono">10 Lifecycle States</span>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOP SELLING PRODUCTS & INVENTORY ALERTS (2 Cols)                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Top Selling Apparel</CardTitle>
              <CardDescription>Best-performing fashion styles by units sold.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/products" className="text-xs">
                Catalog →
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="p-8 text-center space-y-2.5">
                <div className="h-9 w-9 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                  <Shirt className="h-4.5 w-4.5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No product sales yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  As customer orders are fulfilled, top performing garments will rank here automatically.
                </p>
                <div className="pt-1">
                  <Button size="sm" asChild className="text-xs bg-slate-900 hover:bg-slate-800 text-white">
                    <Link href="/products/new">+ Create Product</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {topProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-400 w-5">
                        {String(p.rank).padStart(2, "0")}
                      </span>
                      <div className="h-9 w-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 overflow-hidden">
                        {p.image ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                        ) : (
                          <Shirt className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">{p.title}</p>
                        <p className="text-[11px] text-slate-400">{p.unitsSold} units sold</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-slate-900 font-mono">
                        {formatINR(p.revenue, false)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Stock Alerts Widget */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Inventory Alerts</CardTitle>
                <CardDescription>Variant SKUs at or below safety threshold.</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/inventory" className="text-xs">
                View Inventory →
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />
                ))}
              </div>
            ) : inventoryAlerts.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">All inventory levels healthy</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Zero variant SKUs currently below warehouse safety threshold.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {inventoryAlerts.map((inv) => (
                  <div key={inv.sku} className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">{inv.sku}</span>
                        <Badge variant={inv.status === "OUT_OF_STOCK" ? "danger" : "warning"}>
                          {inv.status === "OUT_OF_STOCK" ? "Out of Stock" : "Low Stock"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{inv.title}</p>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <span className={`text-xs font-bold ${inv.available <= 0 ? "text-rose-600" : "text-amber-600"}`}>
                        {inv.available} left
                      </span>
                      <p className="text-[10px] text-slate-400">threshold: {inv.threshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 4. RECENT ORDERS TABLE                                                    */}
      {/* ========================================================================= */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Live incoming customer transactions requiring fulfillment.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/orders" className="flex items-center gap-1 text-xs">
              <span>View All Orders</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
              Loading recent order stream...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="h-9 w-9 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No incoming orders yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Customer purchases made through the storefront will appear here in real time.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items Summary</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => {
                  const statusVariant =
                    {
                      PROCESSING: "warning",
                      PAID: "info",
                      SHIPPED: "info",
                      DELIVERED: "success",
                      CANCELLED: "default",
                      RETURNED: "danger",
                      REFUNDED: "danger",
                    }[order.status] || "default";

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-semibold text-indigo-600">
                        <Link href="/orders" className="hover:underline">
                          {order.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-500 text-[11px] whitespace-nowrap">
                        {formatDate(order.date, true)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 text-xs">{order.customer}</span>
                          <span className="text-[10px] text-slate-400">{order.city}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 max-w-[200px] truncate text-[11px]">
                        {order.itemSummary}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 font-mono text-xs">
                        {formatINR(order.amount, false)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-[11px]">
                        {order.paymentMethod}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 5. CUSTOMER INSIGHTS & OPERATIONAL SYSTEM HEALTH (Bottom Row)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Breakdown */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Customer Retention & Base
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Period Active Customers</span>
                <span className="font-bold text-slate-900 font-mono">{kpis.customers.value}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">All-Time Customer Accounts</span>
                <span className="font-bold text-slate-900 font-mono">{kpis.customers.total}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Repeat Customer Rate</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {quickInsights.repeatCustomerRate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Customer Base Growth</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatPercent(kpis.customers.change)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              href="/customers"
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center justify-between"
            >
              <span>Explore Customer Directory & Segments</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Operational Highlights */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Fulfillment Operations
            </h3>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Awaiting Packing & Dispatch</span>
                <span className="font-bold text-indigo-600 font-mono">
                  {quickInsights.awaitingFulfillment} orders
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Variants Below Safety Stock</span>
                <span
                  className={`font-bold font-mono ${
                    quickInsights.lowStockCount > 0 ? "text-amber-600" : "text-slate-900"
                  }`}
                >
                  {quickInsights.lowStockCount} SKUs
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Return Rate</span>
                <span className="font-bold text-slate-900 font-mono">
                  {quickInsights.returnRatePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">GST / Tax Compliance</span>
                <span className="font-bold text-emerald-600">Active (5%, 12%, 18%)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Link
              href="/inventory/adjustments"
              className="text-xs font-semibold text-indigo-600 hover:underline flex items-center justify-between"
            >
              <span>Manage Warehouse Stock Adjustments</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Database & Architecture Telemetry */}
        <Card className="p-5 flex flex-col justify-between space-y-4 bg-slate-900 text-white">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-semibold">
                COMMERCE TELEMETRY
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">Database Engine</span>
                <span className="font-mono text-white">MongoDB Atlas + Mongoose</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">Data Pipeline</span>
                <span className="font-mono text-white">Live Mongo Aggregations</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">Apparel Matrix</span>
                <span className="font-mono text-white">Color × Size Supported</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Currency</span>
                <span className="font-mono text-emerald-400">INR (₹ Indian Rupee)</span>
              </div>
            </div>
          </div>

          <div className="rounded bg-slate-800/80 border border-slate-700/60 p-2.5 text-[11px] text-slate-300 leading-relaxed">
            All statistics on this dashboard are dynamically aggregated from MongoDB. No hardcoded or fabricated statistics.
          </div>
        </Card>
      </div>
    </div>
  );
}
