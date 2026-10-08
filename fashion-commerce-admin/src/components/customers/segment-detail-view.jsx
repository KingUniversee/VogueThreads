"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Sparkles,
  Sliders,
  Edit2,
  RefreshCw,
  Eye,
  Trash2,
  Calendar,
  IndianRupee,
  ShoppingBag,
} from "lucide-react";
import { formatINR, formatDate } from "@/lib/formatters";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
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
import { SegmentDialog } from "./segment-dialog";
import { toast } from "sonner";

export function SegmentDetailView({ segmentId }) {
  const [segment, setSegment] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchSegment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/segments/${segmentId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load segment");
      }
      setSegment(data.segment);
      setMembers(data.members || []);
    } catch (err) {
      console.error("Load segment error:", err);
      toast.error(err.message || "Failed to load segment details");
    } finally {
      setLoading(false);
    }
  }, [segmentId]);

  useEffect(() => {
    fetchSegment();
  }, [fetchSegment]);

  const handleRemoveManualMember = async (customerId) => {
    try {
      const res = await fetch(`/api/segments/${segmentId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          action: "REMOVE",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove member");
      }
      toast.success("Member removed from manual cohort");
      fetchSegment();
    } catch (err) {
      console.error("Remove member error:", err);
      toast.error(err.message || "Failed to remove member");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>;
      case "INACTIVE":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Inactive</Badge>;
      case "BLOCKED":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Blocked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const fieldLabels = {
    totalSpend: "Total Spend (INR)",
    orderCount: "Total Orders Count",
    avgOrderValue: "Average Order Value (INR)",
    lastOrderDays: "Recency (Days Since Last Purchase)",
    joinedDays: "Account Age (Days Since Joined)",
  };

  const opLabels = {
    greater_than: "Greater than (>)",
    greater_than_or_equal: "Greater than or equal (≥)",
    less_than: "Less than (<)",
    less_than_or_equal: "Less than or equal (≤)",
    equals: "Equals (=)",
    within_days: "Within days",
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          <p className="text-xs text-slate-500">Loading segment criteria & members...</p>
        </div>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-sm text-slate-600">Segment not found or was removed.</p>
        <Button asChild variant="outline">
          <Link href="/customers/segments">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Segments
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5">
            <Link href="/customers/segments">
              <ArrowLeft className="h-4 w-4" /> Back to Segments
            </Link>
          </Button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-medium text-slate-600">Cohort Details</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchSegment()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh Members
          </Button>
          <Button size="sm" onClick={() => setEditDialogOpen(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Segment
          </Button>
        </div>
      </div>

      {/* Segment Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{segment.name}</h1>
                <Badge
                  variant="outline"
                  className={
                    segment.type === "RULE_BASED"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }
                >
                  {segment.type === "RULE_BASED" ? "Dynamic Rule-Based" : "Static Manual"}
                </Badge>
              </div>
              {segment.description && (
                <p className="text-xs text-slate-500">{segment.description}</p>
              )}
            </div>

            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-6">
              <div>
                <p className="text-xs text-slate-500">Matching Members</p>
                <p className="text-2xl font-bold text-slate-900">{members.length}</p>
              </div>
            </div>
          </div>

          {/* Rules view */}
          {segment.type === "RULE_BASED" && segment.rules && segment.rules.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-slate-400" />
                Targeting Criteria ({segment.matchType === "ANY" ? "Match ANY" : "Match ALL"}):
              </p>
              <div className="flex flex-wrap gap-2">
                {segment.rules.map((r, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/60 px-3 py-1.5 text-xs text-purple-900"
                  >
                    <span className="font-medium">{fieldLabels[r.field] || r.field}</span>
                    <span className="text-purple-600 font-bold">{opLabels[r.operator] || r.operator}</span>
                    <span className="font-semibold">{r.value}</span>
                    {r.operator === "BETWEEN" && (
                      <span>and {r.value2}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            Active Segment Members ({members.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Customers currently satisfying the criteria for this cohort.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[260px]">Customer</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[90px]">Orders</TableHead>
                  <TableHead className="text-right w-[120px]">Total Spent</TableHead>
                  <TableHead className="text-right w-[110px]">AOV</TableHead>
                  <TableHead className="w-[130px]">Last Order</TableHead>
                  <TableHead className="w-[120px]">Joined</TableHead>
                  <TableHead className="text-right w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-slate-500">
                      No customers currently match this segment.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((c) => {
                    const metrics = c.purchasingMetrics || {};
                    const initials = `${c.firstName?.[0] || ""}${c.lastName?.[0] || ""}`.toUpperCase() || "C";
                    return (
                      <TableRow key={c._id} className="hover:bg-slate-50/70">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/customers/${c._id}`}
                                className="text-xs font-semibold text-slate-900 hover:text-blue-600 truncate block"
                              >
                                {c.firstName} {c.lastName}
                              </Link>
                              <p className="text-[11px] text-slate-500 truncate">{c.email}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(c.status)}</TableCell>

                        <TableCell className="text-right font-medium text-xs text-slate-900">
                          {metrics.totalOrders || 0}
                        </TableCell>

                        <TableCell className="text-right font-medium text-xs text-slate-900">
                          {formatINR(metrics.totalSpend || 0)}
                        </TableCell>

                        <TableCell className="text-right text-xs text-slate-600">
                          {formatINR(metrics.averageOrderValue || 0)}
                        </TableCell>

                        <TableCell className="text-xs text-slate-600">
                          {metrics.lastOrderDate ? formatDate(metrics.lastOrderDate, { shortMonth: true }) : "Never"}
                        </TableCell>

                        <TableCell className="text-xs text-slate-500">
                          {formatDate(c.createdAt, { shortMonth: true })}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                              <Link href={`/customers/${c._id}`}>
                                View <Eye className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                            {segment.type === "MANUAL" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveManualMember(c._id)}
                                className="h-7 text-xs text-rose-600 hover:text-rose-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <SegmentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        segment={segment}
        onSuccess={() => fetchSegment()}
      />
    </div>
  );
}
