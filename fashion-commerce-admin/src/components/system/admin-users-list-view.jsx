"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  Lock,
  Search,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Clock,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/formatters";

const SYSTEM_NAV = [
  { href: "/admin-users", label: "Admin Users", active: true },
  { href: "/roles", label: "Roles & Permissions" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/settings", label: "Settings" },
  { href: "/security", label: "Security" },
];

export function AdminUsersListView() {
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    lockedUsers: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    phone: "",
    isActive: true,
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/admin-users?page=${pagination.page}&limit=${pagination.limit}&status=${statusFilter}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (selectedRole) url += `&roleId=${selectedRole}`;

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load admin users");
      }

      setUsers(json.users || []);
      if (json.metrics) setMetrics(json.metrics);
      if (json.pagination) setPagination(json.pagination);
    } catch (err) {
      console.error("Admin users load error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, search, selectedRole]);

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles", { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.roles)) {
        setRoles(json.roles);
      }
    } catch (err) {
      console.warn("Failed to load roles for picker:", err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreateModal = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      roleId: roles[0]?._id || "",
      phone: "",
      isActive: true,
    });
    setFormError("");
    setIsCreateOpen(true);
  };

  const openEditModal = (user) => {
    setActiveUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // Leave blank to keep existing
      roleId: user.role?._id || "",
      phone: user.phone === "—" ? "" : user.phone,
      isActive: user.isActive,
    });
    setFormError("");
    setIsEditOpen(true);
  };

  const openDeleteModal = (user) => {
    setActiveUser(user);
    setFormError("");
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create user");
      }
      setIsCreateOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeUser) return;
    setFormError("");
    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name,
        roleId: formData.roleId,
        phone: formData.phone,
        isActive: formData.isActive,
      };
      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await fetch(`/api/admin-users/${activeUser._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update user");
      }
      setIsEditOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!activeUser) return;
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin-users/${activeUser._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete user");
      }
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await fetch(`/api/admin-users/${user._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !user.isActive,
          reason: user.isActive ? "Manual deactivation by administrator" : "Manual account reactivation",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to toggle status");
        return;
      }
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Admin Staff Accounts"
        description="Manage administrative users, assign enterprise operational roles, and enforce security policies."
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
              <span className="text-xs font-medium text-slate-500">Total Staff</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {metrics.totalUsers}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Registered staff accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Active Accounts</span>
              <div className="p-2 bg-emerald-50 rounded-md text-emerald-700">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              {metrics.activeUsers}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Able to authenticate & manage</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Deactivated</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-600">
                <UserX className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-700 tracking-tight">
              {metrics.inactiveUsers}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Suspended or offboarded</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Locked Accounts</span>
              <div className="p-2 bg-rose-50 rounded-md text-rose-700">
                <Lock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 tracking-tight">
              {metrics.lockedUsers}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Brute-force security lockouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-slate-900"
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 focus:outline-none focus:border-slate-900"
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r._id} value={r._id}>
                {r.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            {["ALL", "ACTIVE", "INACTIVE", "LOCKED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  statusFilter === st
                    ? "bg-slate-900 text-white"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={isLoading}
            className="h-8 px-2.5 gap-1.5 text-xs text-slate-700 border-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="h-8 px-3 gap-1.5 text-xs bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Staff
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <strong>Error loading staff accounts:</strong> {error}
        </div>
      )}

      {/* Admin Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Staff Member</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Last Login</TableHead>
              <TableHead className="text-xs">Created Date</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-xs text-slate-400">
                  {isLoading ? "Loading staff accounts..." : "No administrative staff members found."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u._id} className="hover:bg-slate-50/80">
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                        {u.name?.charAt(0)?.toUpperCase() || "A"}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400" />
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-medium ${
                        u.role?.slug === "super-admin"
                          ? "bg-purple-50 text-purple-800 border-purple-200"
                          : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {u.role?.name || "Unassigned"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {u.isLocked ? (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] gap-1">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </Badge>
                    ) : u.isActive ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-mono text-[11px]">
                    {u.lastLoginAt ? (
                      <div>
                        <div>{formatDate(u.lastLoginAt)}</div>
                        {u.lastLoginIp && <div className="text-[10px] text-slate-400">IP: {u.lastLoginIp}</div>}
                      </div>
                    ) : (
                      <span className="text-slate-400">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 font-mono text-[11px]">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(u)}
                        className={`h-7 px-2 text-[11px] ${
                          u.isActive
                            ? "text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                            : "text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                        }`}
                        title={u.isActive ? "Deactivate account" : "Activate account"}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(u)}
                        className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                        title="Edit staff details"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(u)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                        title="Delete staff account"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* CREATE ADMIN MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Plus className="h-4 w-4 text-slate-600" />
                Add Administrative Staff
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="priya@voguethreads.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Operational Role *</label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                >
                  <option value="">Select Role...</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} {r.isSystem ? "(System)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isSubmitting}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {isEditOpen && activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-slate-600" />
                Edit Staff Details ({activeUser.email})
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Assigned Role</label>
                <select
                  required
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                >
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} {r.isSystem ? "(System)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">
                  Reset Password (Leave blank to keep unchanged)
                </label>
                <input
                  type="password"
                  minLength={8}
                  placeholder="Enter new password if resetting..."
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="userActiveCheck" className="text-slate-700 font-medium">
                  Account is active and permitted to login
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSubmitting}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-semibold text-slate-900">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete administrative account <strong>{activeUser.name}</strong> ({activeUser.email})?
              This action cannot be undone.
            </p>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="h-8 text-xs bg-rose-600 text-white hover:bg-rose-700"
              >
                {isSubmitting ? "Deleting..." : "Permanently Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
