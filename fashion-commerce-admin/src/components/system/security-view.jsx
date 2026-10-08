"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { formatDate } from "@/lib/formatters";

const SYSTEM_NAV = [
  { href: "/admin-users", label: "Admin Users" },
  { href: "/roles", label: "Roles & Permissions" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/settings", label: "Settings" },
  { href: "/security", label: "Security", active: true },
];

export function SecurityView() {
  const router = useRouter();
  const [securityData, setSecurityData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  const fetchSecurityData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/security", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setSecurityData(json);
      }
    } catch (err) {
      console.warn("Failed to load security overview:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters in length." });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update password");
      }
      setPasswordMessage({
        type: "success",
        text: "Password updated successfully. Please use your new password next time you sign in.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      fetchSecurityData();
    } catch (err) {
      setPasswordMessage({ type: "error", text: err.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSession = async () => {
    if (!confirm("Are you sure you want to terminate this administrative session? You will be redirected to the login screen.")) {
      return;
    }
    try {
      await fetch("/api/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVOKE_SESSIONS" }),
      });
      router.push("/admin/login");
    } catch (err) {
      alert("Failed to revoke session: " + err.message);
    }
  };

  const currentUser = securityData?.currentUser || {};
  const metrics = securityData?.metrics || { activeStaff: 0, lockedAccounts: 0, totalStaff: 0 };
  const recentEvents = securityData?.recentEvents || [];

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Security & Session Management"
        description="Inspect authenticated sessions, enforce password hygiene, and review critical access events."
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

      {/* Security Posture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Active Staff</span>
              <div className="p-2 bg-emerald-50 rounded-md text-emerald-700">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {metrics.activeStaff} / {metrics.totalStaff}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Active authenticated accounts</p>
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
              {metrics.lockedUsers || metrics.lockedAccounts || 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Brute-force security lockouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Security Audit Trail</span>
              <div className="p-2 bg-slate-100 rounded-md text-slate-700">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 tracking-tight">
              Active
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Immutable ledger enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Current Session</span>
              <div className="p-2 bg-blue-50 rounded-md text-blue-700">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {currentUser.roleName || "Super Admin"}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">{currentUser.email || "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Security Grid: Password Change + Session Invalidation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Change Password */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-600" />
              Update Account Password
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 text-xs">
            {passwordMessage.text && (
              <div
                className={`p-3 rounded border text-xs flex items-center gap-2 ${
                  passwordMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {passwordMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    placeholder="Enter existing password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-8 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">New Password (Min 8 characters) *</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-8 pl-2.5 pr-8 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isChangingPassword || !currentPassword || !newPassword}
                  className="h-8 px-3 text-xs bg-slate-900 text-white hover:bg-slate-800"
                >
                  {isChangingPassword ? "Updating..." : "Change Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Active Session & Revocation */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-600" />
              Active Session Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Signed In As:</span>
                <span className="font-semibold text-slate-900">{currentUser.name || "Administrator"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-mono text-slate-700">{currentUser.email || "admin@voguethreads.in"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Role Authority:</span>
                <Badge variant="outline" className="text-[10px] bg-white text-slate-800 font-medium">
                  {currentUser.roleName || "Super Admin"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cookie Security:</span>
                <span className="text-emerald-700 font-medium font-mono text-[11px]">
                  HttpOnly • SameSite=Lax
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <span className="font-semibold text-slate-900 block">Session Termination</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                If you suspect unauthorized activity or have finished your administrative shift, you can immediately invalidate your active session cookie.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRevokeSession}
                className="h-8 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Terminate Active Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Security Activity Stream */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-600" />
              Recent Security & Access Events
            </CardTitle>
            <Link
              href="/audit-logs"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Full Audit Trail →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 text-xs">
            {recentEvents.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No recent security activity logged.
              </div>
            ) : (
              recentEvents.map((event) => (
                <div key={event._id} className="p-3.5 flex items-center justify-between hover:bg-slate-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                        {event.action}
                      </Badge>
                      <span className="font-medium text-slate-900">{event.actorEmail}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Target: {event.resource} ({event.resourceId}) {event.ipAddress && `• IP: ${event.ipAddress}`}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {formatDate(event.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
