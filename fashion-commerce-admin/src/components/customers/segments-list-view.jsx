"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Sparkles,
  Users,
  Plus,
  RefreshCw,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Sliders,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/formatters";
import { SegmentDialog } from "./segment-dialog";
import { toast } from "sonner";

export function SegmentsListView() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [segmentToDelete, setSegmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/segments");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load segments");
      }
      setSegments(data.segments || []);
    } catch (err) {
      console.error("Load segments error:", err);
      toast.error(err.message || "Failed to load segments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const handleOpenCreate = () => {
    setSelectedSegment(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (seg) => {
    setSelectedSegment(seg);
    setDialogOpen(true);
  };

  const handleOpenDelete = (seg) => {
    setSegmentToDelete(seg);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!segmentToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/segments/${segmentToDelete._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete segment");
      }
      toast.success("Segment archived successfully");
      setDeleteDialogOpen(false);
      setSegmentToDelete(null);
      fetchSegments();
    } catch (err) {
      console.error("Delete segment error:", err);
      toast.error(err.message || "Failed to delete segment");
    } finally {
      setDeleting(false);
    }
  };

  const formatRulesSummary = (seg) => {
    if (seg.type === "MANUAL") {
      return "Manually selected customer cohort";
    }
    if (!seg.rules || seg.rules.length === 0) {
      return "No conditions defined";
    }

    const fieldMap = {
      totalSpend: "Spend (₹)",
      orderCount: "Orders",
      avgOrderValue: "AOV (₹)",
      lastOrderDays: "Recency (days)",
      joinedDays: "Joined (days)",
    };

    const opMap = {
      greater_than: ">",
      greater_than_or_equal: "≥",
      less_than: "<",
      less_than_or_equal: "≤",
      equals: "=",
      within_days: "within days",
    };

    const parts = seg.rules.map((r) => {
      const f = fieldMap[r.field] || r.field;
      const op = opMap[r.operator] || r.operator;
      return `${f} ${op} ${r.value}`;
    });

    const joinWord = seg.matchType === "ANY" ? " OR " : " AND ";
    return parts.join(joinWord);
  };

  const ruleBasedCount = segments.filter((s) => s.type === "RULE_BASED").length;
  const manualCount = segments.filter((s) => s.type === "MANUAL").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Segments"
        description="Dynamic rule-based cohorts and curated customer groups for marketing, engagement, and VIP targeting."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchSegments()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate} className="bg-slate-900 text-white hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Segment
            </Button>
          </div>
        }
      />

      {/* Top 3 KPI metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Total Segments</CardTitle>
            <Layers className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{segments.length}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Active behavioral cohorts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Dynamic Rule-Based</CardTitle>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{ruleBasedCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Auto-evaluated on live data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-slate-500">Manual Lists</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{manualCount}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Handpicked customer profiles</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[280px]">Segment</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[320px]">Criteria / Rules</TableHead>
                  <TableHead className="text-center w-[120px]">Active Members</TableHead>
                  <TableHead className="w-[140px]">Created</TableHead>
                  <TableHead className="text-right w-[90px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                        <span className="text-xs">Loading customer segments...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : segments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                        <Layers className="h-8 w-8 text-slate-300" />
                        <p className="text-sm font-medium text-slate-700">No segments created yet</p>
                        <p className="text-xs text-slate-400">
                          Create your first segment to target high-value buyers or at-risk shoppers.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  segments.map((seg) => (
                    <TableRow key={seg._id} className="hover:bg-slate-50/70 transition-colors">
                      <TableCell>
                        <div className="min-w-0 space-y-0.5">
                          <Link
                            href={`/customers/segments/${seg._id}`}
                            className="text-xs font-semibold text-slate-900 hover:text-blue-600 block truncate"
                          >
                            {seg.name}
                          </Link>
                          {seg.description && (
                            <p className="text-[11px] text-slate-500 truncate">{seg.description}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {seg.type === "RULE_BASED" ? (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-200 text-[11px]"
                          >
                            Dynamic
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]"
                          >
                            Manual
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <p className="text-xs text-slate-600 font-mono text-[11px] truncate">
                          {formatRulesSummary(seg)}
                        </p>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center font-medium text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">
                          {seg.memberCount || 0}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-slate-500">
                        {formatDate(seg.createdAt, { shortMonth: true })}
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs">Segment Options</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/customers/segments/${seg._id}`} className="cursor-pointer">
                                <Eye className="mr-2 h-3.5 w-3.5 text-slate-500" />
                                View Members
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(seg)} className="cursor-pointer">
                              <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-500" />
                              Edit Definition
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenDelete(seg)}
                              className="cursor-pointer text-rose-600 focus:text-rose-600"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600" />
                              Delete Segment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <SegmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        segment={selectedSegment}
        onSuccess={() => fetchSegments()}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Customer Segment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-slate-800">{segmentToDelete?.name}</span>?
              This will not delete or alter any customer accounts or order histories.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
