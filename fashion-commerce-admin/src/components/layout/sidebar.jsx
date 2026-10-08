"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shirt,
  Layers,
  Sparkles,
  Tag,
  SlidersHorizontal,
  Boxes,
  ClipboardPenLine,
  AlertTriangle,
  ShoppingBag,
  Users,
  PieChart,
  Star,
  TicketPercent,
  BadgePercent,
  LineChart,
  BarChart3,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  History,
  Settings,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const NAVIGATION_SECTIONS = [
  {
    title: "MAIN",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "CATALOG",
    items: [
      { name: "Products", href: "/products", icon: Shirt },
      { name: "Categories", href: "/categories", icon: Layers },
      { name: "Collections", href: "/collections", icon: Sparkles },
      { name: "Brands", href: "/brands", icon: Tag },
      { name: "Attributes", href: "/attributes", icon: SlidersHorizontal },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      { name: "Inventory", href: "/inventory", icon: Boxes, exact: true },
      { name: "Stock Adjustments", href: "/inventory/adjustments", icon: ClipboardPenLine },
      { name: "Low Stock", href: "/inventory/low-stock", icon: AlertTriangle, badge: "Alert" },
    ],
  },
  {
    title: "ORDERS",
    items: [
      { name: "Orders", href: "/orders", icon: ShoppingBag },
    ],
  },
  {
    title: "CUSTOMERS",
    items: [
      { name: "Customers", href: "/customers", icon: Users, exact: true },
      { name: "Segments", href: "/customers/segments", icon: PieChart },
      { name: "Reviews", href: "/reviews", icon: Star },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { name: "Coupons", href: "/coupons", icon: TicketPercent },
      { name: "Discounts", href: "/discounts", icon: BadgePercent },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { name: "Overview", href: "/analytics", icon: LineChart, exact: true },
      { name: "Sales", href: "/analytics/sales", icon: BarChart3 },
      { name: "Products", href: "/analytics/products", icon: Shirt },
      { name: "Customers", href: "/analytics/customers", icon: Users },
      { name: "Conversion", href: "/analytics/conversion", icon: TrendingUp },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { name: "Admin Users", href: "/admin-users", icon: UserCheck },
      { name: "Roles & Permissions", href: "/roles", icon: ShieldCheck },
      { name: "Audit Logs", href: "/audit-logs", icon: History },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Security", href: "/security", icon: Lock },
    ],
  },
];

function SidebarView({
  isCollapsed,
  onToggleCollapse,
  isMobile,
  setMobileOpen,
  isItemActive,
}) {
  return (
    <div className="flex h-full flex-col justify-between bg-admin-sidebar-bg text-admin-sidebar-text border-r border-admin-sidebar-border select-none">
      {/* Top: Logo & Collapse / Close Toggle */}
      <div className="relative">
        <div
          className={cn(
            "flex h-14 items-center border-b border-admin-sidebar-border transition-all duration-200",
            isCollapsed ? "justify-center px-2" : "justify-between px-3.5"
          )}
        >
          <Logo
            href="/"
            collapsed={isCollapsed}
            theme="light"
            size="md"
            showSubtext={true}
            subtext="COMMERCE ADMIN"
          />

          {/* Desktop Single Collapse/Expand Arrow Button */}
          {!isMobile && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn(
                "hidden lg:flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-slate-700",
                isCollapsed
                  ? "absolute -right-3 top-4 z-40 h-6 w-6 rounded-full border border-slate-700 bg-slate-900 shadow-md"
                  : "h-6 w-6 rounded"
              )}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          {/* Mobile Drawer Close Button */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="lg:hidden flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close drawer"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Items */}
      <div className="max-h-[calc(100vh-8.5rem)] overflow-y-auto px-2.5 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {NAVIGATION_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-2.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                {section.title}
              </p>
            ) : (
              <div className="mx-auto my-1.5 h-px w-5 bg-slate-800" />
            )}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;

                const navLink = (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if (isMobile) setMobileOpen(false);
                    }}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md text-xs font-medium transition-colors relative",
                      isCollapsed
                        ? "h-9 w-9 justify-center mx-auto"
                        : "px-2.5 py-2",
                      active
                        ? "bg-slate-800/90 text-white shadow-subtle font-semibold"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                    )}
                  >
                    {/* Active pill indicator */}
                    {active && (
                      <span
                        className={cn(
                          "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-indigo-500",
                          isCollapsed && "hidden"
                        )}
                      />
                    )}

                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active
                          ? "text-indigo-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      )}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-[12px]">{item.name}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="ml-auto rounded px-1.5 py-0.2 text-[9px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/50">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return navLink;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Live Storefront Quick Link */}
      <div className="p-2 border-t border-admin-sidebar-border bg-admin-sidebar-surface/30">
        {isCollapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              </a>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              View Live Storefront
            </TooltipContent>
          </Tooltip>
        ) : (
          <a
            href={process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3001"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-white border border-slate-700/60 shadow-xs transition-all group"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Storefront</span>
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </a>
        )}
      </div>

      {/* Bottom Area: System Status (No competing button) */}
      <div className="p-3 border-t border-admin-sidebar-border bg-admin-sidebar-surface/50">
        {isCollapsed ? (
          <div className="flex items-center justify-center py-1" title="Store Online • v1.0-JS">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Store Online</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">v1.0-JS</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const pathname = usePathname();

  function isItemActive(item) {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  }

  function handleToggleCollapse() {
    setCollapsed((previous) => !previous);
  }

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          "hidden lg:block sticky top-0 h-screen shrink-0 transition-all duration-200 z-30",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <TooltipProvider delayDuration={100}>
          <SidebarView
            isCollapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
            isMobile={false}
            setMobileOpen={setMobileOpen}
            isItemActive={isItemActive}
          />
        </TooltipProvider>
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-200 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <TooltipProvider delayDuration={100}>
          <SidebarView
            isCollapsed={false}
            onToggleCollapse={null}
            isMobile={true}
            setMobileOpen={setMobileOpen}
            isItemActive={isItemActive}
          />
        </TooltipProvider>
      </div>
    </>
  );
}
