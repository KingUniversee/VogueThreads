"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { cn } from "@/lib/utils";

export function StorefrontShell({ children, cartCount = 0, wishlistCount = 0 }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="flex flex-col min-h-screen bg-[#E8E4DC] text-vt-black antialiased relative">
      {/* Global Header */}
      <SiteHeader cartCount={cartCount} wishlistCount={wishlistCount} />

      {/* Main Content Body */}
      <main
        className={cn(
          "flex-1 w-full",
          isHome ? "pt-0" : "pt-16 sm:pt-20"
        )}
      >
        {children}
      </main>

      {/* Global Mobile Floating Dock */}
      <MobileBottomNav />

      {/* Global Footer */}
      <SiteFooter />

      {/* Global Notifications / Toasts */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className:
            "bg-vt-black/90 backdrop-blur-xl border border-white/20 text-white rounded-2xl shadow-floating text-xs font-medium py-3 px-4",
          descriptionClassName: "text-white/60 text-[11px]",
        }}
      />
    </div>
  );
}
