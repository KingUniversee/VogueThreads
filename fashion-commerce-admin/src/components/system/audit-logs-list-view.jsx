"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Shield,
  FileText,
  Eye,
  AlertCircle,
  Database,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/formatters";

const SYSTEM_NAV = [
  { href: "/admin-users", label: "Admin Users" },
  { href: "/roles", label: "Roles & Permissions" },
  { href: "/audit-logs", label: "Audit Logs", active: true },
  { href: "/settings", label: "Settings" },
  { href: "/security", label: "Security" },
];

export function AuditLogsListView() {
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState({
    totalLogs: 0,
    uniqueActorsCount: 0,
    topAction: "—",
    lastActivityDate: null,
  });
  const [filterOptions, setFilterOptions] = useState({ actors: [], actions: [], resources: [] });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedActor, setSelectedActor] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedResource, setSelectedResource] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Inspector Modal
  const [inspectedLog, setInspectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/audit-logs?page=${pagination.page}&limit=${pagination.limit}&action=${selectedAction}&resource=${selectedResource}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (selectedActor) url += `&actor=${encodeURIComponent(selectedActor)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load audit logs");
      }

      setLogs(json.logs || []);
      if (json.metrics) setMetrics(json.metrics);
      if (json.pagination) setPagination(json.pagination);
      if (json.filterOptions) setFilterOptions(json.filterOptions);
    } catch (err) {
      console.error("Audit logs fetch error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedAction, selectedResource, search, selectedActor, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeColor = (action = "") => {
    if (action.includes("DELETE")) return "bg-rose-50 text-rose-700 border-rose-200";
    if (action.includes("CREATE")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (action.includes("UPDATE") || action.includes("MODERATE")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (action.includes("LOGIN")) return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Immutable Audit Trail"
        description="Tamper-evident administrative compliance ledger tracking all actions, configuration changes, and security events."
      />

      {/* Sub-nav */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        {SYSTEM_NAV.map((nav) => (
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Total Audit Events</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <History className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {(metrics?.totalLogs ?? 0).toLocaleString("en-IN")}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Immutable ledger entries recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Active Actors</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {metrics?.uniqueActorsCount ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Distinct staff identities logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Most Frequent Action</span>
              <div className="p-2 bg-blue-50 rounded-md text-blue-700">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate font-mono">
              {metrics?.topAction || "—"}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Highest operational volume</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Last Activity</span>
              <div className="p-2 bg-emerald-50 rounded-md text-emerald-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-900 tracking-tight font-mono">
              {metrics.lastActivityDate ? formatDate(metrics.lastActivityDate) : "—"}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Most recent recorded event</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search action, actor, resource ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-slate-900"
            />
          </div>

          <select
            value={selectedModuleResource(selectedResource)}
            onChange={(e) => setSelectedResource(e.target.value)}
            className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="ALL">All Modules</option>
            {filterOptions.resources.map((res) => (
              <option key={res} value={res}>
                {res}
              </option>
            ))}
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="ALL">All Actions</option>
            {filterOptions.actions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>

          <select
            value={selectedActor}
            onChange={(e) => setSelectedActor(e.target.value)}
            className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="">All Actors</option>
            {filterOptions.actors.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700"
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoading}
            className="h-8 px-2.5 gap-1 text-xs text-slate-700 border-slate-200 ml-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <strong>Error loading audit logs:</strong> {error}
        </div>
      )}

      {/* Audit Log Stream Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">Actor</TableHead>
              <TableHead className="text-xs">Action</TableHead>
              <TableHead className="text-xs">Module</TableHead>
              <TableHead className="text-xs">Target ID</TableHead>
              <TableHead className="text-xs text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-slate-400">
                  {isLoading ? "Querying immutable audit ledger..." : "No audit trail events match your filter criteria."}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log._id} className="hover:bg-slate-50/80">
                  <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-semibold text-slate-900">{log.actorEmail}</span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className={`text-[10px] font-mono ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-slate-700">{log.resource}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-400 text-[11px] truncate max-w-[140px]">
                    {log.resourceId}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInspectedLog(log)}
                      className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      Inspect
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-500">
        <div>
          Showing page {pagination.page} of {pagination.pages} ({pagination.total} events)
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            className="h-8 px-2.5 text-xs"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.pages || isLoading}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            className="h-8 px-2.5 text-xs"
          >
            Next
          </Button>
        </div>
      </div>

      {/* AUDIT INSPECTOR MODAL */}
      {inspectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">Audit Event Inspector</h3>
                <Badge variant="outline" className={`text-[10px] font-mono ${getActionBadgeColor(inspectedLog.action)}`}>
                  {inspectedLog.action}
                </Badge>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Actor</span>
                  <span className="font-semibold text-slate-900">{inspectedLog.actorEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Module</span>
                  <span className="font-semibold text-slate-900">{inspectedLog.resource}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Target ID</span>
                  <span className="font-mono text-slate-700 text-[11px] truncate block">{inspectedLog.resourceId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Timestamp</span>
                  <span className="font-mono text-slate-700 text-[11px]">
                    {new Date(inspectedLog.createdAt).toISOString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Client IP</span>
                  <span className="font-mono text-slate-700 text-[11px]">{inspectedLog.ipAddress}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Ledger Entry</span>
                  <span className="font-mono text-slate-500 text-[10px] truncate block">{inspectedLog._id}</span>
                </div>
              </div>

              {/* Optional Reason */}
              {inspectedLog.details?.reason && (
                <div className="p-3 bg-blue-50/70 border border-blue-200/70 rounded text-xs text-blue-900">
                  <strong>Reason recorded:</strong> {inspectedLog.details.reason}
                </div>
              )}

              {/* State Changes: Before & After Diff Viewer */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-900 text-xs block">State Mutation Diff</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <span className="font-semibold text-rose-700 text-[11px] uppercase block mb-1">
                      Before State
                    </span>
                    <pre className="text-[10px] font-mono text-slate-700 overflow-x-auto p-2 bg-white rounded border border-slate-200 max-h-56">
                      {inspectedLog.details?.before
                        ? JSON.stringify(inspectedLog.details.before, null, 2)
                        : "— (None / Initial State)"}
                    </pre>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <span className="font-semibold text-emerald-700 text-[11px] uppercase block mb-1">
                      After State
                    </span>
                    <pre className="text-[10px] font-mono text-slate-700 overflow-x-auto p-2 bg-white rounded border border-slate-200 max-h-56">
                      {inspectedLog.details?.after
                        ? JSON.stringify(inspectedLog.details.after, null, 2)
                        : JSON.stringify(inspectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 flex-shrink-0">
              <Button
                size="sm"
                onClick={() => setInspectedLog(null)}
                className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
              >
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function selectedModuleResource(val) {
  return val || "ALL";
}
