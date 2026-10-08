"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Search, Heart, ShoppingBag, User, Menu, Package, MapPin, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchModal } from "./search-modal";
import { MobileNav } from "./mobile-nav";
import { LogoutWarningModal } from "@/components/auth/logout-warning-modal";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Men", href: "/shop?gender=MEN", gender: "MEN" },
  { name: "Women", href: "/shop?gender=WOMEN", gender: "WOMEN" },
  { name: "Collections", href: "/collections" },
  { name: "Sale", href: "/shop?sale=true", isSale: true },
];

function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const genderParam = searchParams.get("gender")?.toUpperCase();
  const isSaleParam = searchParams.get("sale");
  const categoryParam = searchParams.get("category");

  return (
    <nav className="hidden lg:flex items-center gap-7" aria-label="Main Navigation">
      {NAV_LINKS.map((link) => {
        let isActive = false;
        if (link.href === "/") {
          isActive = pathname === "/";
        } else if (link.href === "/collections") {
          isActive = pathname === "/collections" || pathname.startsWith("/collections/");
        } else if (link.isSale) {
          isActive = pathname === "/sale" || isSaleParam === "true";
        } else if (link.gender) {
          isActive = pathname === "/shop" && genderParam === link.gender;
        } else if (link.href === "/shop") {
          isActive =
            pathname === "/shop" && !genderParam && !isSaleParam && !categoryParam;
        } else {
          isActive = pathname.startsWith(link.href);
        }

        return (
          <Link
            key={link.name}
            href={link.href}
            className={cn(
              "text-xs uppercase tracking-[0.16em] font-medium transition-all relative py-1 focus-ring rounded-sm",
              link.isSale
                ? "text-red-400 hover:text-red-300 font-semibold"
                : isActive
                ? "text-white font-semibold"
                : "text-white/70 hover:text-white"
            )}
          >
            <span>{link.name}</span>
            {isActive && (
              <span className="absolute -bottom-1 inset-x-0 h-[2px] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function NavLinksFallback() {
  return (
    <nav className="hidden lg:flex items-center gap-7" aria-label="Main Navigation">
      {NAV_LINKS.map((link) => (
        <span
          key={link.name}
          className="text-xs uppercase tracking-[0.16em] font-medium text-white/70 py-1"
        >
          {link.name}
        </span>
      ))}
    </nav>
  );
}

export function SiteHeader({ cartCount = 0, wishlistCount = 0 }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [liveCartCount, setLiveCartCount] = useState(cartCount);
  const [liveWishlistCount, setLiveWishlistCount] = useState(wishlistCount);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Sync user authentication state strictly backed by server session
  useEffect(() => {
    const checkUser = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("vt_user") || "null");
        setUser(saved);
      } catch {
        setUser(null);
      }
    };
    checkUser();

    // Verify with server-side session to ensure localStorage cannot forge auth state
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.customer) {
          setUser(data.customer);
          localStorage.setItem("vt_user", JSON.stringify(data.customer));
        } else {
          localStorage.removeItem("vt_user");
          setUser(null);
        }
      })
      .catch(() => {});

    window.addEventListener("vt_auth_changed", checkUser);
    return () => window.removeEventListener("vt_auth_changed", checkUser);
  }, []);

  // Real-time cart and wishlist synchronization across the entire storefront
  useEffect(() => {
    const updateCounts = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("vt_cart") || "[]");
        const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        setLiveCartCount(count);
      } catch {
        setLiveCartCount(0);
      }
      try {
        const wishlist = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
        setLiveWishlistCount(wishlist.length);
      } catch {
        setLiveWishlistCount(0);
      }
    };
    updateCounts();
    window.addEventListener("vt_cart_updated", updateCounts);
    window.addEventListener("vt_wishlist_updated", updateCounts);
    return () => {
      window.removeEventListener("vt_cart_updated", updateCounts);
      window.removeEventListener("vt_wishlist_updated", updateCounts);
    };
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userDropdownOpen && !e.target.closest("#vt-user-menu-container")) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [userDropdownOpen]);

  // Track scroll position for header glass compression
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-40 transition-all duration-300",
          isScrolled
            ? "bg-[#0A0A0B]/90 backdrop-blur-2xl border-b border-white/15 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] py-2.5 sm:py-3"
            : "bg-[#0A0A0B]/65 backdrop-blur-xl border-b border-white/10 py-3.5 sm:py-4"
        )}
      >
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Mobile Left: Hamburger + Mobile Search */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="p-2 -ml-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-ring"
              aria-label="Open mobile navigation drawer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors sm:hidden focus-ring"
              aria-label="Search catalog"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Brand Logo & Desktop Navigation */}
          <div className="flex items-center gap-8 xl:gap-10">
            <Link
              href="/"
              className="font-display font-bold text-xl sm:text-2xl tracking-[0.18em] text-white uppercase select-none hover:opacity-90 transition-opacity focus-ring rounded-sm flex items-center gap-1.5"
            >
              <span>VogueThreads</span>
            </Link>

            {/* Desktop Nav with Suspense */}
            <Suspense fallback={<NavLinksFallback />}>
              <NavLinks />
            </Suspense>
          </div>

          {/* Desktop Center/Right: Search Pill */}
          <div className="hidden sm:flex flex-1 max-w-xs lg:max-w-sm mx-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "w-full h-10 px-4 rounded-full flex items-center justify-between",
                "bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15",
                "text-xs text-white/60 hover:text-white/90 transition-all duration-200 group shadow-inner focus-ring"
              )}
              aria-label="Quick search (Press Command K)"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors" />
                <span>Search products...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/60 border border-white/10">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Actions: Wishlist, Cart, Account */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative p-2.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-ring"
              aria-label="Saved items in wishlist"
            >
              <Heart className="w-5 h-5 stroke-[1.75]" />
              {liveWishlistCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-vt-accent text-[9px] font-bold text-white flex items-center justify-center animate-scale-up">
                  {liveWishlistCount}
                </span>
              )}
            </Link>

            {/* Cart / Bag */}
            <Link
              href="/cart"
              className="relative p-2.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-ring"
              aria-label="Shopping bag"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
              {liveCartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-vt-black text-[9px] font-bold flex items-center justify-center animate-scale-up">
                  {liveCartCount}
                </span>
              )}
            </Link>

            {/* Account / User Menu */}
            {user ? (
              <div id="vt-user-menu-container" className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="relative flex items-center gap-2 p-1.5 pr-2.5 rounded-full text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all focus-ring cursor-pointer"
                  aria-label={`User menu for ${user.name}`}
                  title={user.name}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 text-[#0A0A0B] text-[10px] font-black flex items-center justify-center uppercase shadow-sm">
                    {user.name?.charAt(0) || "U"}
                  </div>
                  <span className="text-xs font-semibold max-w-[100px] truncate hidden md:inline">
                    {user.name?.split(" ")[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                  <span className="absolute top-1.5 left-6 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0A0A0B]" />
                </button>

                {/* Liquid Glass User Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-2xl p-2 z-50 text-text-primary shadow-2xl animate-fade-in"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(250, 248, 245, 0.92) 50%, rgba(255, 255, 255, 0.98) 100%)",
                      backdropFilter: "blur(28px) saturate(190%)",
                      WebkitBackdropFilter: "blur(28px) saturate(190%)",
                      border: "1.5px solid rgba(255, 255, 255, 0.9)",
                      boxShadow: "0 20px 40px -8px rgba(0, 0, 0, 0.2), 0 4px 12px -2px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {/* User Profile Header */}
                    <div className="px-3 py-2.5 border-b border-black/[0.06] mb-1">
                      <p className="text-xs font-bold text-text-primary truncate">{user.name}</p>
                      <p className="text-[11px] text-text-muted truncate">{user.email}</p>
                    </div>

                    {/* Navigation Options */}
                    <div className="space-y-0.5">
                      <Link
                        href="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-black/5 transition-colors"
                      >
                        <User className="w-4 h-4 text-text-muted" />
                        <span>Account Dashboard</span>
                      </Link>

                      <Link
                        href="/account?tab=orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-black/5 transition-colors"
                      >
                        <Package className="w-4 h-4 text-text-muted" />
                        <span>My Orders</span>
                      </Link>

                      <Link
                        href="/account?tab=addresses"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-text-primary hover:bg-black/5 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-text-muted" />
                        <span>Saved Addresses</span>
                      </Link>
                    </div>

                    {/* Logout Button */}
                    <div className="pt-1 border-t border-black/[0.06] mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setShowLogoutModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="relative p-2.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors hidden sm:inline-flex focus-ring"
                aria-label="Sign in to VogueThreads"
                title="Sign In"
              >
                <User className="w-5 h-5 stroke-[1.75]" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Command/Search Modal */}
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Mobile Navigation Drawer */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      {/* Logout Warning Confirmation Modal */}
      <LogoutWarningModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
      />
    </>
  );
}
