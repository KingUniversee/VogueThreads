"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shirt,
  Boxes,
  IndianRupee,
  Search,
  AlertTriangle,
  ArrowUpDown,
  ExternalLink,
  Tag,
} from "lucide-react";
import { formatINR, formatNumberIN } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsDatePicker } from "./analytics-date-picker";

const ANALYTICS_NAV = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/sales", label: "Sales" },
  { href: "/analytics/products", label: "Products", active: true },
  { href: "/analytics/customers", label: "Customers" },
  { href: "/analytics/conversion", label: "Conversion" },
];

export function ProductAnalyticsView() {
  const [range, setRange] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("revenue");
  const [sortOrder, setSortOrder] = useState("desc");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (r, start, end, q, sort, order) => {
      setIsLoading(true);
      setError(null);
      try {
        let url = `/api/analytics/products?range=${r}&sortBy=${sort}&sortOrder=${order}`;
        if (r === "custom" && start && end) {
          url += `&startDate=${start}&endDate=${end}`;
        }
        if (q && q.trim()) {
          url += `&search=${encodeURIComponent(q.trim())}`;
        }
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "Failed to load product analytics");
        }
        setData(json.data);
      } catch (err) {
        console.error("Product analytics error:", err);
        setError(err.message || "Failed to load product analytics");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(range, customStart, customEnd, search, sortBy, sortOrder);
  }, [range, customStart, customEnd, search, sortBy, sortOrder, fetchData]);

  const handleRangeChange = (newRange, start, end) => {
    setRange(newRange);
    if (start && end) {
      setCustomStart(start);
      setCustomEnd(end);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const summary = data?.summary || {};
  const period = data?.period || {};
  const products = data?.products || [];

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Product Analytics"
        description="Merchandising performance derived strictly from order line-item snapshots: top revenue generators, SKU velocity, and inventory alerts."
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
        onRefresh={() => fetchData(range, customStart, customEnd, search, sortBy, sortOrder)}
        isLoading={isLoading}
      />

      {/* Period Description */}
      {period.label && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-600">
          <span className="font-medium text-slate-800">
            Active Filter Window: <span className="font-semibold">{period.label}</span>
          </span>
          <span className="text-[11px] text-slate-500">Historical line-item unit prices & subtotals</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <strong>Error loading product analytics:</strong> {error}
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Merchandise Revenue</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(summary.totalRevenue || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Generated by product sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Total Units Sold</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <Boxes className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatNumberIN(summary.totalUnits || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Individual apparel items</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Products with Sales</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <Shirt className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatNumberIN(summary.totalProductsSold || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Distinct catalog styles sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Average Selling Price</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <Tag className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(summary.averageSellingPrice || 0)}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Weighted ASP across items</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search product title or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-slate-900"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {products.length} {products.length === 1 ? "product" : "products"}
        </div>
      </div>

      {/* Product Analytics Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Product Details</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead
                className="text-xs text-right cursor-pointer select-none"
                onClick={() => handleSort("revenue")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Revenue</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead
                className="text-xs text-right cursor-pointer select-none"
                onClick={() => handleSort("unitsSold")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Units Sold</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead
                className="text-xs text-right cursor-pointer select-none"
                onClick={() => handleSort("ordersCount")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Orders</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </TableHead>
              <TableHead className="text-xs text-right">Avg Price (ASP)</TableHead>
              <TableHead
                className="text-xs text-right cursor-pointer select-none"
                onClick={() => handleSort("availableStock")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Available Stock</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-400">
                  No product sales records match the selected period and query.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p.productId || p.title} className="hover:bg-slate-50/80">
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {p.thumbnail ? (
                          <Image
                            src={p.thumbnail}
                            alt={p.title}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <Shirt className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 line-clamp-1">{p.title}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                          {p.skus?.slice(0, 2).join(", ")}
                          {p.skus?.length > 2 && ` +${p.skus.length - 2}`}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">{p.category}</TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-slate-900">
                    {formatINR(p.revenue)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-slate-700">
                    {formatNumberIN(p.unitsSold)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-slate-600">
                    {formatNumberIN(p.ordersCount)}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-slate-600">
                    {formatINR(p.avgSellingPrice)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-mono text-slate-700 font-medium">
                        {formatNumberIN(p.availableStock)}
                      </span>
                      {p.isLowStock && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 font-semibold"
                        >
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Low Stock
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
