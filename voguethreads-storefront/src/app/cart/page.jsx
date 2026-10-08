"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trash2,
  ShieldCheck,
  RotateCcw,
  CreditCard,
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Tag,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

const FREE_SHIPPING_THRESHOLD = 999;
const STANDARD_SHIPPING_FEE = 49;

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const loadCart = async () => {
    let currentItems = [];
    try {
      currentItems = JSON.parse(localStorage.getItem("vt_cart") || "[]");
      setItems(currentItems);
    } catch {
      setItems([]);
    } finally {
      setIsLoaded(true);
    }

    // Sync with server if logged in
    try {
      const user = localStorage.getItem("vt_user");
      if (user) {
        if (currentItems.length > 0) {
          const syncRes = await fetch("/api/cart/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guestItems: currentItems }),
          });
          if (syncRes.ok) {
            const data = await syncRes.json();
            if (data.success && Array.isArray(data.items)) {
              setItems(data.items);
              localStorage.setItem("vt_cart", JSON.stringify(data.items));
            }
          }
        } else {
          const getRes = await fetch("/api/cart");
          if (getRes.ok) {
            const data = await getRes.json();
            if (data.success && Array.isArray(data.items) && data.items.length > 0) {
              setItems(data.items);
              localStorage.setItem("vt_cart", JSON.stringify(data.items));
            }
          }
        }
      }
    } catch (err) {
      console.warn("Cart server sync warning:", err);
    }
  };

  useEffect(() => {
    loadCart();
    window.addEventListener("vt_cart_updated", loadCart);
    return () => window.removeEventListener("vt_cart_updated", loadCart);
  }, []);

  const saveCart = (newItems) => {
    setItems(newItems);
    localStorage.setItem("vt_cart", JSON.stringify(newItems));
    window.dispatchEvent(new Event("vt_cart_updated"));

    // Async server persistence if authenticated
    try {
      const user = localStorage.getItem("vt_user");
      if (user) {
        fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: newItems }),
        }).catch((e) => console.warn("Cart PUT warning:", e));
      }
    } catch {
      // non-fatal
    }
  };

  const updateQuantity = (sku, delta) => {
    const updated = items
      .map((item) => {
        if (item.sku === sku || item.slug === sku) {
          const nextQty = item.quantity + delta;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        }
        return item;
      })
      .filter(Boolean);

    saveCart(updated);
  };

  const removeItem = (sku, title) => {
    const updated = items.filter((item) => item.sku !== sku && item.slug !== sku);
    saveCart(updated);
    toast.info("Removed from cart", { description: title });
  };

  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a coupon code");
      return;
    }

    if (subtotal <= 0) {
      toast.error("Add items to your cart before applying a coupon");
      return;
    }

    setIsValidatingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
      });

      const data = await res.json();
      if (data.success && data.coupon) {
        setDiscountAmount(data.coupon.discountAmount);
        setAppliedCoupon(data.coupon.code);
        localStorage.setItem(
          "vt_applied_coupon",
          JSON.stringify({
            code: data.coupon.code,
            discountAmount: data.coupon.discountAmount,
          })
        );
        toast.success(data.message || `Coupon ${data.coupon.code} applied!`);
      } else {
        toast.error(data.error || "Invalid or ineligible coupon code");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to validate coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode("");
    localStorage.removeItem("vt_applied_coupon");
    toast.info("Coupon removed");
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : STANDARD_SHIPPING_FEE;
  const total = Math.max(0, subtotal - discountAmount + shipping);
  const progressToFreeShipping = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  if (!isLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full pb-20 pt-8 sm:pt-12 bg-background">
      <Container>
        {/* Header */}
        <div className="pb-8 border-b border-border/60 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Review Order</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
              Shopping Bag
            </h1>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            {items.length} {items.length === 1 ? "distinct item" : "distinct items"}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Cart Items List (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Free Shipping Progress Indicator */}
              <div className="p-4 rounded-2xl bg-[#F8F7F4] border border-[#E5E2DC] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">
                    {amountToFreeShipping === 0
                      ? "✨ You've unlocked Complimentary Express Delivery!"
                      : `Add ${formatPrice(amountToFreeShipping)} more to qualify for Free Shipping`}
                  </span>
                  <span className="text-text-muted font-bold">{progressToFreeShipping}%</span>
                </div>
                <div className="h-2 rounded-full bg-[#EDEDF0] overflow-hidden">
                  <div
                    className="h-full bg-brand-primary rounded-full transition-all duration-500"
                    style={{ width: `${progressToFreeShipping}%` }}
                  />
                </div>
              </div>

              {/* Items Card List */}
              <div className="divide-y divide-border/60 border border-border/70 rounded-3xl overflow-hidden bg-surface">
                {items.map((item, idx) => (
                  <div
                    key={`${item.sku || item.slug}-${idx}`}
                    className="p-5 sm:p-6 flex gap-4 sm:gap-6 items-start"
                  >
                    {/* Item Thumbnail */}
                    <div className="relative aspect-[3/4] w-20 sm:w-24 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-border/60">
                      <StorefrontImage
                        src={item.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"}
                        alt={item.title}
                        fill
                        className="object-cover object-center"
                        sizes="96px"
                      />
                    </div>

                    {/* Item Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <Link
                        href={`/product/${item.slug}`}
                        className="text-sm sm:text-base font-bold text-text-primary hover:text-brand-primary line-clamp-1 transition-colors"
                      >
                        {item.title}
                      </Link>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        {item.color && <span>Color: <strong className="text-text-primary">{item.color}</strong></span>}
                        {item.size && <span>• Size: <strong className="text-text-primary">{item.size}</strong></span>}
                      </div>

                      <div className="text-sm font-bold text-text-primary pt-1">
                        {formatPrice(item.price)}
                      </div>

                      {/* Quantity & Delete Controls */}
                      <div className="flex items-center justify-between pt-3">
                        <div className="inline-flex items-center border border-border rounded-xl bg-surface p-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.sku || item.slug, -1)}
                            className="p-1 rounded-lg hover:bg-neutral-100 text-text-muted hover:text-text-primary transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-text-primary">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.sku || item.slug, 1)}
                            className="p-1 rounded-lg hover:bg-neutral-100 text-text-muted hover:text-text-primary transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.sku || item.slug, item.title)}
                          className="text-xs text-text-muted hover:text-red-500 font-medium flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary Column (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border/70 shadow-xs space-y-6">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  Order Summary
                </h3>

                {/* Coupon Input */}
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Promotional Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. LUXURY20"
                      value={couponCode}
                      disabled={isValidatingCoupon || !!appliedCoupon}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-border bg-surface text-xs uppercase font-medium tracking-wider text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:opacity-60"
                    />
                    {appliedCoupon ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveCoupon}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button type="submit" variant="outline" size="sm" disabled={isValidatingCoupon}>
                        {isValidatingCoupon ? "Checking..." : "Apply"}
                      </Button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <span className="text-[11px] font-semibold text-emerald-700 block">
                      ✓ Coupon {appliedCoupon} applied successfully
                    </span>
                  )}
                </form>

                {/* Totals Breakdown */}
                <div className="space-y-3 pt-4 border-t border-border/60 text-xs text-text-muted">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-text-primary">{formatPrice(subtotal)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Discount ({appliedCoupon})</span>
                      <span>-{formatPrice(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Estimated Shipping</span>
                    <span className="font-bold text-text-primary">
                      {shipping === 0 ? "FREE" : formatPrice(shipping)}
                    </span>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-border/60 text-base font-black text-text-primary">
                    <span>Total MRP</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <span className="text-[10px] text-text-muted block text-right">
                    Includes GST & domestic delivery
                  </span>
                </div>

                {/* Checkout CTA */}
                <Button
                  asChild
                  variant="primary"
                  size="lg"
                  className="w-full py-4 text-sm font-bold uppercase tracking-wider shadow-lg shadow-brand-primary/20"
                >
                  <Link href="/checkout">
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-border/60 space-y-2 text-[11px] text-text-muted">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>256-bit encrypted checkout via Razorpay & UPI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-brand-primary shrink-0" />
                    <span>7-day doorstep exchange & return guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center max-w-md mx-auto">
            <EmptyState
              title="Your bag is currently empty"
              description="Explore our latest architectural cuts and elevated everyday staples."
              primaryAction={{
                label: "Continue Shopping",
                href: "/shop",
              }}
            />
          </div>
        )}
      </Container>
    </div>
  );
}
