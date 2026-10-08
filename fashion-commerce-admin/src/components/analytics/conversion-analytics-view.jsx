"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  CreditCard,
  RotateCcw,
  Users,
  Info,
  Layers,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { formatNumberIN } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsDatePicker } from "./analytics-date-picker";

const ANALYTICS_NAV = [
  { href: "/analytics", label: "Overview" },
  { href: "/analytics/sales", label: "Sales" },
  { href: "/analytics/products", label: "Products" },
  { href: "/analytics/customers", label: "Customers" },
  { href: "/analytics/conversion", label: "Conversion", active: true },
];

export function ConversionAnalyticsView() {
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
      let url = `/api/analytics/conversion?range=${r}`;
      if (r === "custom" && start && end) {
        url += `&startDate=${start}&endDate=${end}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load conversion analytics");
      }
      setData(json.data);
    } catch (err) {
      console.error("Conversion analytics error:", err);
      setError(err.message || "Failed to load conversion analytics");
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

  const period = data?.period || {};
  const storefrontTracking = data?.storefrontTracking || {};
  const conversions = data?.commerceConversions || {};

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Conversion & Funnel Analytics"
        description="Authentic commerce conversion rates, checkout fulfillment efficiency, and storefront telemetry status."
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
          <span className="text-[11px] text-slate-500">Calculated strictly from MongoDB records</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <strong>Error loading conversion data:</strong> {error}
        </div>
      )}

      {/* Storefront Telemetry Notice Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-md mt-0.5">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-amber-950">Storefront Session Telemetry Disconnected</h3>
              <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-900 border-amber-300 font-mono">
                ZERO FAKE METRICS POLICY
              </Badge>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              {storefrontTracking.message ||
                "Storefront session tracking is not connected. Visitor-to-cart funnel telemetry cannot be authentically computed without storefront session events."}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-amber-900/70">
              <span className="font-medium text-amber-950">Missing Telemetry Streams:</span>
              {storefrontTracking.missingTelemetry?.map((m) => (
                <span key={m} className="px-2 py-0.5 bg-amber-100/70 rounded border border-amber-200 font-mono">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Authentic Database Commerce Conversion Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Authentic Commerce Conversion Benchmarks (Source of Truth)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fulfillment Rate */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Order Fulfillment Rate</span>
                <div className="p-2 bg-emerald-50 rounded-md text-emerald-700">
                  <PackageCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {conversions.fulfillmentConversionRate ?? 0}%
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatNumberIN(conversions.completedOrders || 0)} of {formatNumberIN(conversions.totalOrdersPlaced || 0)} orders fulfilled
              </p>
            </CardContent>
          </Card>

          {/* Payment Capture Rate */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Payment Capture Rate</span>
                <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {conversions.paymentCaptureRate ?? 0}%
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Transactions with confirmed payment
              </p>
            </CardContent>
          </Card>

          {/* Return Rate */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Return Rate</span>
                <div className="p-2 bg-rose-50 rounded-md text-rose-700">
                  <RotateCcw className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-rose-700 tracking-tight">
                {conversions.returnRate ?? 0}%
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Orders returned by customer</p>
            </CardContent>
          </Card>

          {/* Repeat Buyer Rate */}
          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Customer Retention Rate</span>
                <div className="p-2 bg-blue-50 rounded-md text-blue-700">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {conversions.repeatBuyerRate ?? 0}%
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatNumberIN(conversions.repeatCustomers || 0)} repeat customers
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Integration Guide Card */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            Storefront Funnel Telemetry Integration Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 text-xs text-slate-600">
          <p>
            To activate real-time funnel conversion metrics (Storefront Visits → Product Views → Add to Cart → Initiated Checkout → Completed Purchase), the storefront client must dispatch tracking beacons to an analytics ingestion pipeline.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-semibold text-slate-800 mb-1">1. Session Cookie</div>
              <p className="text-[11px] text-slate-500">
                Generate an anonymous <code className="font-mono text-slate-700">vt_session_id</code> on the customer storefront.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-semibold text-slate-800 mb-1">2. Event Beacons</div>
              <p className="text-[11px] text-slate-500">
                Emit <code className="font-mono text-slate-700">page_view</code>, <code className="font-mono text-slate-700">add_to_cart</code>, and <code className="font-mono text-slate-700">begin_checkout</code> events.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <div className="font-semibold text-slate-800 mb-1">3. Ingestion Webhook</div>
              <p className="text-[11px] text-slate-500">
                Ingest session milestones into a timeseries telemetry collection for funnel conversion visualization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
