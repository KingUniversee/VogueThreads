"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    const checkState = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("vt_user") || "null");
        setUser(saved);
      } catch {
        setUser(null);
      }
      try {
        const wishlist = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
        setWishlistCount(wishlist.length);
      } catch {
        setWishlistCount(0);
      }
    };
    checkState();
    window.addEventListener("vt_auth_changed", checkState);
    window.addEventListener("vt_wishlist_updated", checkState);
    return () => {
      window.removeEventListener("vt_auth_changed", checkState);
      window.removeEventListener("vt_wishlist_updated", checkState);
    };
  }, []);

  const bottomNavItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Shop", href: "/shop", icon: Compass },
    { name: "Wishlist", href: "/wishlist", icon: Heart },
    { name: "Account", href: user ? "/account" : "/login", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-5 inset-x-0 z-40 pointer-events-none flex justify-center px-4">
      <nav
        aria-label="Mobile Bottom Navigation"
        className={cn(
          "pointer-events-auto flex items-center justify-around w-full max-w-[320px] px-3 py-2.5 rounded-full",
          "bg-vt-black/90 backdrop-blur-2xl border border-white/20 shadow-floating text-white"
        )}
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-full transition-all duration-200 focus-ring",
                isActive
                  ? "text-white bg-white/20 scale-105 shadow-sm font-semibold"
                  : "text-white/60 hover:text-white"
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5 stroke-[1.75]" />
                {item.name === "Wishlist" && wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-vt-accent text-[8px] font-bold text-white flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium tracking-wider mt-0.5">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
