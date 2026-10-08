"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const LABEL_OVERRIDES = {
  products: "Products",
  categories: "Categories",
  collections: "Collections",
  brands: "Brands",
  attributes: "Attributes",
  inventory: "Inventory",
  adjustments: "Stock Adjustments",
  orders: "Orders",
  returns: "Returns",
  refunds: "Refunds",
  customers: "Customers",
  segments: "Segments",
  reviews: "Reviews",
  coupons: "Coupons",
  discounts: "Discounts",
  campaigns: "Campaigns",
  banners: "Banners",
  analytics: "Analytics",
  "admin-users": "Admin Users",
  roles: "Roles & Permissions",
  "audit-logs": "Audit Logs",
  settings: "Settings",
  security: "Security",
  new: "New",
};

export function Breadcrumbs({ className }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className={cn("flex items-center text-xs text-slate-500", className)}>
        <span className="font-medium text-slate-800">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1.5 text-xs text-slate-500", className)}
    >
      <Link
        href="/"
        className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>

      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label =
          LABEL_OVERRIDES[segment] ||
          segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-slate-900 transition-colors truncate max-w-[150px]"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
