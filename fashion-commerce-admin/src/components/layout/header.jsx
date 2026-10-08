"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  Plus,
  ChevronDown,
  User,
  Settings,
  Shield,
  LogOut,
  Shirt,
  Boxes,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Breadcrumbs } from "./breadcrumbs";

export function Header({ setMobileOpen }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState({
    name: "Super Administrator",
    email: "admin@voguethreads.in",
    roleName: "Super Admin",
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Fetch current session info
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (err) {
        // Fallback to default state
      }
    }
    loadUser();
  }, []);

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch (err) {
      window.location.href = "/admin/login";
    } finally {
      setIsLoggingOut(false);
    }
  }

  const [notifications] = useState([
    {
      id: "n1",
      title: "Low stock alert",
      desc: "Classic Crewneck Tee (Black / L) is below 5 units threshold.",
      time: "10m ago",
      type: "warning",
    },
    {
      id: "n2",
      title: "New order paid",
      desc: "Order #ORD-2026-1042 paid via Razorpay UPI (₹3,499).",
      time: "25m ago",
      type: "success",
    },
    {
      id: "n3",
      title: "Return requested",
      desc: "Customer requested return for Slim Fit Chinos.",
      time: "1h ago",
      type: "info",
    },
  ]);

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm shadow-subtle">
      {/* Left side: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right side: Global Search, Quick Actions, Notifications, User Menu */}
      <div className="flex items-center gap-2">
        {/* Global Search Bar (Trigger) */}
        <div className="relative hidden md:block">
          <div className="flex items-center gap-2 h-8 w-60 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-500 hover:border-slate-300 transition-colors cursor-pointer">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="flex-1 truncate">Search products, orders, SKUs...</span>
            <kbd className="hidden sm:inline-flex h-4 items-center rounded border border-slate-200 bg-white px-1 text-[10px] font-mono text-slate-400">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Quick Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quick Action</span>
              <ChevronDown className="h-3 w-3 opacity-80" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Quick Shortcuts</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/products/new" className="flex items-center gap-2">
                <Shirt className="h-3.5 w-3.5 text-slate-500" />
                <span>New Product</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/inventory/adjustments" className="flex items-center gap-2">
                <Boxes className="h-3.5 w-3.5 text-slate-500" />
                <span>Stock Adjustment</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/orders" className="flex items-center gap-2">
                <ShoppingBag className="h-3.5 w-3.5 text-slate-500" />
                <span>View Orders</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications Popover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative text-slate-600">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                3
              </span>
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-slate-100 p-3">
              <span className="text-xs font-semibold text-slate-900">Notifications</span>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600">
                3 unread
              </span>
            </div>
            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="flex gap-2.5 p-3 hover:bg-slate-50/80 transition-colors">
                  <div className="mt-0.5">
                    {n.type === "warning" && (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    {n.type === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    {n.type === "info" && (
                      <ShoppingBag className="h-4 w-4 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-900">{n.title}</p>
                      <span className="text-[10px] text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-2 text-center">
              <Link
                href="/audit-logs"
                className="text-[11px] font-medium text-indigo-600 hover:underline"
              >
                View full activity stream →
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* Admin Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full p-0.5 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white shadow-subtle">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">
                  {currentUser.email}
                </span>
              </div>
              <ChevronDown className="hidden xl:block h-3 w-3 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold text-slate-900">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                <div className="pt-1">
                  <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {currentUser.roleName || "Super Admin"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                <span>Store Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/security" className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-slate-500" />
                <span>Security & Sessions</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/audit-logs" className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Audit Trail</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 flex items-center gap-2 cursor-pointer"
            >
              {isLoggingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
