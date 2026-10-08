"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Users,
  Check,
  AlertTriangle,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

const SYSTEM_NAV = [
  { href: "/admin-users", label: "Admin Users" },
  { href: "/roles", label: "Roles & Permissions", active: true },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/settings", label: "Settings" },
  { href: "/security", label: "Security" },
];

export function RolesListView() {
  const [roles, setRoles] = useState([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState({});
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    permissions: [],
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/roles", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load roles");
      }
      setRoles(json.roles || []);
      setPermissionsByCategory(json.permissionsByCategory || {});
      setAvailablePermissions(json.availablePermissions || []);
    } catch (err) {
      console.error("Roles fetch error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const openCreateModal = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      permissions: [],
    });
    setFormError("");
    setIsCreateOpen(true);
  };

  const openEditModal = (role) => {
    setActiveRole(role);
    setFormData({
      name: role.name,
      slug: role.slug,
      description: role.description || "",
      permissions: [...(role.permissions || [])],
    });
    setFormError("");
    setIsEditOpen(true);
  };

  const openDeleteModal = (role) => {
    setActiveRole(role);
    setFormError("");
    setIsDeleteOpen(true);
  };

  const handlePermissionToggle = (permCode) => {
    setFormData((prev) => {
      const exists = prev.permissions.includes(permCode);
      const updated = exists
        ? prev.permissions.filter((p) => p !== permCode)
        : [...prev.permissions, permCode];
      return { ...prev, permissions: updated };
    });
  };

  const handleCategorySelectAll = (category) => {
    const catPerms = (permissionsByCategory[category] || []).map((p) => p.code);
    setFormData((prev) => {
      const allSelected = catPerms.every((c) => prev.permissions.includes(c));
      const updated = allSelected
        ? prev.permissions.filter((p) => !catPerms.includes(p))
        : Array.from(new Set([...prev.permissions, ...catPerms]));
      return { ...prev, permissions: updated };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create role");
      }
      setIsCreateOpen(false);
      fetchRoles();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeRole) return;
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/roles/${activeRole._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update role");
      }
      setIsEditOpen(false);
      fetchRoles();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!activeRole) return;
    setFormError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/roles/${activeRole._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete role");
      }
      setIsDeleteOpen(false);
      fetchRoles();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Roles & Permissions Grid"
        description="Configure enterprise Role-Based Access Control (RBAC) matrices and assign operational capabilities."
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

      {/* Action Toolbar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
        <div className="text-xs text-slate-500 font-medium">
          Showing {roles.length} roles configured across {availablePermissions.length} distinct system permissions
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRoles}
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
            Create Role
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
          <strong>Error loading roles:</strong> {error}
        </div>
      )}

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((r) => (
          <Card key={r._id} className="hover:border-slate-300 transition-colors flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    {r.name}
                    {r.isSystem && (
                      <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 gap-1">
                        <Lock className="h-2.5 w-2.5" /> System
                      </Badge>
                    )}
                  </CardTitle>
                  <span className="text-[11px] font-mono text-slate-400">slug: {r.slug}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(r)}
                    className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                    title="Edit Role & Permissions"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  {!r.isSystem && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(r)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                      title="Delete Role"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-3 pb-4 space-y-3 flex-1 flex flex-col justify-between">
              <p className="text-xs text-slate-600 line-clamp-2 min-h-[32px]">
                {r.description || "No description provided."}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  {r.userCount} {r.userCount === 1 ? "staff" : "staff"} assigned
                </span>
                <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-700 border-slate-200">
                  {r.permissionsCount} permissions
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CREATE ROLE MODAL */}
      {isCreateOpen && (
        <RoleFormModal
          title="Create Operational Role"
          formData={formData}
          setFormData={setFormData}
          permissionsByCategory={permissionsByCategory}
          onTogglePermission={handlePermissionToggle}
          onCategorySelectAll={handleCategorySelectAll}
          onSubmit={handleCreateSubmit}
          onClose={() => setIsCreateOpen(false)}
          isSubmitting={isSubmitting}
          formError={formError}
          isSystemRole={false}
        />
      )}

      {/* EDIT ROLE MODAL */}
      {isEditOpen && activeRole && (
        <RoleFormModal
          title={`Edit Role: ${activeRole.name}`}
          formData={formData}
          setFormData={setFormData}
          permissionsByCategory={permissionsByCategory}
          onTogglePermission={handlePermissionToggle}
          onCategorySelectAll={handleCategorySelectAll}
          onSubmit={handleEditSubmit}
          onClose={() => setIsEditOpen(false)}
          isSubmitting={isSubmitting}
          formError={formError}
          isSystemRole={activeRole.isSystem && activeRole.slug === "super-admin"}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && activeRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-semibold text-slate-900">Confirm Role Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete custom role <strong>{activeRole.name}</strong>?
            </p>
            {activeRole.userCount > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                ⚠️ Warning: {activeRole.userCount} staff member(s) are currently assigned to this role. You must reassign them before deletion.
              </div>
            )}
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

function RoleFormModal({
  title,
  formData,
  setFormData,
  permissionsByCategory,
  onTogglePermission,
  onCategorySelectAll,
  onSubmit,
  onClose,
  isSubmitting,
  formError,
  isSystemRole,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-600" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={onSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              {formError}
            </div>
          )}

          {isSystemRole && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded text-xs text-purple-900">
              🛡️ <strong>Super Administrator</strong> is a protected system role with full unrestricted access across all modules. Individual permissions cannot be stripped.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-slate-700 block mb-1">Role Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="font-medium text-slate-700 block mb-1">Slug Identifier</label>
              <input
                type="text"
                placeholder="auto-generated"
                disabled={isSystemRole || Boolean(formData.slug)}
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900 disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-slate-700 block mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900 resize-none"
            />
          </div>

          {/* Granular Permissions Matrix */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-xs">Granular Permissions Matrix</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {formData.permissions.length} selected
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(permissionsByCategory).map(([category, perms]) => {
                const allSelected = perms.every((p) => formData.permissions.includes(p.code));
                return (
                  <div key={category} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                      <span className="font-semibold text-slate-800 uppercase tracking-wide text-[11px]">
                        {category}
                      </span>
                      {!isSystemRole && (
                        <button
                          type="button"
                          onClick={() => onCategorySelectAll(category)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((p) => {
                        const isChecked = formData.permissions.includes(p.code);
                        return (
                          <label
                            key={p.code}
                            className={`flex items-start gap-2 p-2 rounded border transition-colors cursor-pointer ${
                              isChecked
                                ? "bg-white border-slate-300 shadow-xs"
                                : "bg-white/60 border-slate-200 text-slate-500"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked || isSystemRole}
                              disabled={isSystemRole}
                              onChange={() => onTogglePermission(p.code)}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-slate-900"
                            />
                            <div>
                              <div className="font-medium text-slate-900 leading-tight">{p.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.code}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
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
              {isSubmitting ? "Saving..." : "Save Role"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
