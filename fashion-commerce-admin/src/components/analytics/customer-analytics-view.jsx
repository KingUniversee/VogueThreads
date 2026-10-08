"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  ShoppingBag,
  RotateCw,
  Crown,
  Sparkles,
  TrendingUp,
  Mail,
  Calendar,
} from "lucide-react";
import { formatINR, formatNumberIN, formatDate } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsDatePicker } from "./analytics-date-picker";

const ANALYTICS_NAV = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/sales", label: "Sales" },
  { href: "/analytics/products", label: "Products" },
  { href: "/analytics/customers", label: "Customers", active: true },
  { href: "/analytics/conversion", label: "Conversion" },
];

export function CustomerAnalyticsView() {
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
      let url = `/api/analytics/customers?range=${r}`;
      if (r === "custom" && start && end) {
        url += `&startDate=${start}&endDate=${end}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load customer analytics");
      }
      setData(json.data);
    } catch (err) {
      console.error("Customer analytics error:", err);
      setError(err.message || "Failed to load customer analytics");
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

  const acquisition = data?.acquisition || {};
  const tiers = data?.tiers || {};
  const topSpenders = data?.topSpenders || [];
  const period = data?.period || {};

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Customer Analytics"
        description="Buyer acquisition cohorts, repeat purchase behavior, customer lifetime value segmentation, and high-value customer accounts."
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
            Observation Period: <span className="font-semibold">{period.label}</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Customer lifetime values aggregated across all verified orders
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <strong>Error loading customer data:</strong> {error}
        </div>
      )}

      {/* 4 Acquisition KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Customer Base</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatNumberIN(acquisition.totalRegistered || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Total registered in database</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">New Signups</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <UserPlus className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatNumberIN(acquisition.newInPeriod || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Registered during this interval</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Active Buyers</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatNumberIN(acquisition.activeBuyersInPeriod || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Placed an order in this interval</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Repeat Buyer Rate</span>
              <div className="p-2 bg-emerald-50 rounded-md text-emerald-700">
                <RotateCw className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              {acquisition.repeatBuyerPercent || 0}%
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {formatNumberIN(acquisition.repeatBuyersInPeriod || 0)} repeat buyers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Composition & Spend Tiers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buyer Cohort Breakdown */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-600" />
              Buyer Composition in Period
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">First-Time Buyers</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatNumberIN(acquisition.newBuyersInPeriod || 0)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${
                      acquisition.activeBuyersInPeriod > 0
                        ? ((acquisition.newBuyersInPeriod / acquisition.activeBuyersInPeriod) * 100).toFixed(0)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500">
                Placed their first order with VogueThreads
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Returning Customers</span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatNumberIN(acquisition.repeatBuyersInPeriod || 0)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${
                      acquisition.activeBuyersInPeriod > 0
                        ? ((acquisition.repeatBuyersInPeriod / acquisition.activeBuyersInPeriod) * 100).toFixed(0)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500">
                Have placed 2 or more orders historically
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Spend Tiers */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-600" />
              Customer Lifetime Value (LTV) Tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {/* VIP */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/60 border border-amber-200/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-amber-100 text-amber-800">
                  <Crown className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">VIP Clients</div>
                  <div className="text-[11px] text-slate-500">Total spend exceeding ₹10,000</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {formatNumberIN(tiers.vip?.count || 0)}
                </div>
                <div className="text-[10px] text-amber-700 font-medium">High LTV</div>
              </div>
            </div>

            {/* Mid */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slate-200 text-slate-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Core Buyers</div>
                  <div className="text-[11px] text-slate-500">Spend between ₹2,500 – ₹10,000</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {formatNumberIN(tiers.mid?.count || 0)}
                </div>
                <div className="text-[10px] text-slate-500">Core Segment</div>
              </div>
            </div>

            {/* Starter */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slate-200 text-slate-700">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Starter Orders</div>
                  <div className="text-[11px] text-slate-500">Spend under ₹2,500</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-slate-900 font-mono">
                  {formatNumberIN(tiers.starter?.count || 0)}
                </div>
                <div className="text-[10px] text-slate-500">Entry Tier</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Spenders Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Crown className="h-4 w-4 text-slate-600" />
              Highest Value Customer Accounts
            </CardTitle>
            <Badge variant="outline" className="text-[10px] text-slate-500 font-normal">
              Top 15 Lifetime Accounts
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs text-right">Orders Placed</TableHead>
                <TableHead className="text-xs text-right">Lifetime Spend</TableHead>
                <TableHead className="text-xs text-right">Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSpenders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-xs text-slate-400">
                    No customer order records found in database.
                  </TableCell>
                </TableRow>
              ) : (
                topSpenders.map((c) => (
                  <TableRow key={c.email} className="hover:bg-slate-50">
                    <TableCell className="text-xs">
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {c.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono text-slate-700">
                      {formatNumberIN(c.ordersCount)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-slate-900">
                      {formatINR(c.totalSpend)}
                    </TableCell>
                    <TableCell className="text-xs text-right text-slate-500 font-mono text-[11px]">
                      {c.lastOrderDate ? formatDate(c.lastOrderDate) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
