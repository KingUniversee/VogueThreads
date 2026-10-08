"use client";

import React, { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import { X, ArrowRight, ShoppingBag, Heart, User, ShieldCheck, LogOut } from "lucide-react";
import { LogoutWarningModal } from "@/components/auth/logout-warning-modal";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Shop All", href: "/shop" },
  { name: "Men", href: "/shop?gender=MEN" },
  { name: "Women", href: "/shop?gender=WOMEN" },
  { name: "Collections", href: "/collections" },
  { name: "Sale", href: "/shop?sale=true", isSale: true },
];

export function MobileNav({ open, onOpenChange }) {
  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const syncData = () => {
      try {
        const savedUser = JSON.parse(localStorage.getItem("vt_user") || "null");
        setUser(savedUser);
      } catch {
        setUser(null);
      }
      try {
        const cart = JSON.parse(localStorage.getItem("vt_cart") || "[]");
        setCartCount(cart.reduce((sum, i) => sum + (i.quantity || 1), 0));
      } catch {
        setCartCount(0);
      }
      try {
        const wishlist = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
        setWishlistCount(wishlist.length);
      } catch {
        setWishlistCount(0);
      }
    };

    syncData();
    window.addEventListener("vt_auth_changed", syncData);
    window.addEventListener("vt_cart_updated", syncData);
    window.addEventListener("vt_wishlist_updated", syncData);
    return () => {
      window.removeEventListener("vt_auth_changed", syncData);
      window.removeEventListener("vt_cart_updated", syncData);
      window.removeEventListener("vt_wishlist_updated", syncData);
    };
  }, []);

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fade-in" />
          <DialogPrimitive.Content
            className={cn(
              "fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-vt-black text-white p-6",
              "flex flex-col justify-between shadow-2xl border-r border-white/10",
              "animate-slide-up focus:outline-none overflow-y-auto"
            )}
          >
            {/* Header & Nav */}
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/10">
                <Link
                  href="/"
                  onClick={() => onOpenChange(false)}
                  className="font-display font-bold text-2xl tracking-[0.18em] text-white uppercase"
                >
                  VogueThreads
                </Link>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-ring cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </DialogPrimitive.Close>
              </div>

              {/* Logged in User Bar */}
              {user ? (
                <div className="my-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-[#0A0A0B] text-xs font-black flex items-center justify-center uppercase shadow-sm">
                      {user.name?.charAt(0) || "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-white/60 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      setShowLogoutModal(true);
                    }}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="my-4">
                  <Link
                    href="/login"
                    onClick={() => onOpenChange(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white text-vt-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Sign In to Account</span>
                  </Link>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="py-4 space-y-1" aria-label="Mobile Drawer Navigation">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center justify-between py-3.5 px-3 rounded-xl text-base font-medium transition-all focus-ring",
                      link.isSale
                        ? "text-red-400 hover:bg-white/5 font-semibold"
                        : "text-white/90 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <span>{link.name}</span>
                    <ArrowRight className="w-4 h-4 opacity-40" />
                  </Link>
                ))}
              </nav>
            </div>

            {/* Bottom Account & Trust Strip */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Link
                  href="/cart"
                  onClick={() => onOpenChange(false)}
                  className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors focus-ring"
                  aria-label="Shopping Cart"
                >
                  <ShoppingBag className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] tracking-wider uppercase font-semibold">Cart</span>
                  {cartCount > 0 && (
                    <span className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-white text-vt-black text-[9px] font-bold flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => onOpenChange(false)}
                  className="relative flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors focus-ring"
                  aria-label="Wishlist"
                >
                  <Heart className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] tracking-wider uppercase font-semibold">Wishlist</span>
                  {wishlistCount > 0 && (
                    <span className="absolute top-1.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-vt-accent text-white text-[9px] font-bold flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
                <Link
                  href={user ? "/account" : "/login"}
                  onClick={() => onOpenChange(false)}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors focus-ring"
                  aria-label="Account Dashboard"
                >
                  <User className="w-5 h-5 mb-1.5" />
                  <span className="text-[10px] tracking-wider uppercase font-semibold">
                    {user ? "Account" : "Sign In"}
                  </span>
                </Link>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Authentic Luxury Guarantee</span>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Logout Warning Confirmation Modal */}
      <LogoutWarningModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
      />
    </>
  );
}

