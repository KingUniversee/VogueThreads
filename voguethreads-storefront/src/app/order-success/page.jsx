"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Printer,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { CancelOrderModal } from "@/components/orders/cancel-order-modal";
import { formatPrice } from "@/lib/utils";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const rawId = searchParams.get("orderId") || "";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      try {
        const savedUser = JSON.parse(localStorage.getItem("vt_user") || "null");
        let foundOrder = null;

        // 1. If rawId provided, fetch live order from MongoDB API
        if (rawId) {
          try {
            const apiRes = await fetch(`/api/orders/${encodeURIComponent(rawId)}`);
            const apiData = await apiRes.json();
            if (apiData.success && apiData.order) {
              const o = apiData.order;
              foundOrder = {
                id: `#${o.orderNumber}`,
                orderNumber: o.orderNumber,
                date: o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
                status: o.status || "Confirmed",
                total: o.pricing?.grandTotal || 0,
                subtotal: o.pricing?.subtotal || 0,
                shippingFee: o.pricing?.shippingFee || 0,
                discount: o.pricing?.discountAmount || 0,
                customerName: o.customerDetails?.name || savedUser?.name || "Customer",
                customerEmail: o.customerDetails?.email || savedUser?.email || "",
                shippingAddress: {
                  name: o.shippingAddress?.fullName || o.customerDetails?.name || "Customer",
                  address: o.shippingAddress?.addressLine1 || "",
                  cityStateZip: `${o.shippingAddress?.city || ""}, ${o.shippingAddress?.state || ""} - ${o.shippingAddress?.pinCode || ""}`.trim().replace(/^,|-$/g, ""),
                  phone: o.shippingAddress?.phone || o.customerDetails?.phone || savedUser?.phone || "",
                },
                shippingMethod: "Priority Air Dispatch",
                paymentMethod: o.payment?.method === "COD" ? "Cash on Delivery" : "Cards & UPI",
                items: (o.items || []).map((it, idx) => ({
                  id: it.variantId || `${idx}`,
                  title: it.title,
                  price: it.unitPrice,
                  quantity: it.quantity,
                  color: it.color || "Standard",
                  size: it.size || "Standard",
                  image: it.image || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800",
                })),
              };
            }
          } catch (e) {
            console.warn("Could not fetch order from MongoDB API:", e);
          }
        }

        // 2. Check user orders from localStorage if not found yet
        if (!foundOrder && savedUser?.email) {
          const userOrders = JSON.parse(localStorage.getItem(`vt_orders_${savedUser.email}`) || "[]");
          if (rawId) {
            foundOrder = userOrders.find(
              (o) =>
                o.id === rawId ||
                o.id === `#${rawId}` ||
                o.orderNumber === rawId ||
                o.id?.replace("#", "").toLowerCase() === rawId.replace("#", "").toLowerCase()
            );
          } else if (userOrders.length > 0) {
            foundOrder = userOrders[0];
          }
        }

        // 3. Check global orders from localStorage
        if (!foundOrder) {
          const globalOrders = JSON.parse(localStorage.getItem("vt_orders") || "[]");
          if (rawId) {
            foundOrder = globalOrders.find(
              (o) =>
                o.id === rawId ||
                o.id === `#${rawId}` ||
                o.orderNumber === rawId ||
                o.id?.replace("#", "").toLowerCase() === rawId.replace("#", "").toLowerCase()
            );
          } else if (globalOrders.length > 0) {
            foundOrder = globalOrders[0];
          }
        }

        if (isMounted) setOrder(foundOrder);
      } catch (err) {
        console.warn("Order load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [rawId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#141414] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#E8E4DC] py-16">
        <Container>
          <div className="max-w-md mx-auto text-center p-8 sm:p-10 rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-white/80 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-black/5 text-[#141414] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-[#141414] tracking-tight mb-2">
              Order Receipt Not Found
            </h2>
            <p className="text-xs sm:text-sm text-[#5A5A5E] mb-6 leading-relaxed">
              We could not find an active order matching this reference. Please check your account dashboard for your order history or explore our latest archive.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/account?tab=orders"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#141414] text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors"
              >
                <span>My Orders</span>
              </Link>
              <Link
                href="/shop"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#141414] border border-black/15 text-xs font-bold uppercase tracking-wider hover:bg-neutral-50 transition-colors"
              >
                <span>Explore Catalog</span>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const orderNum = order?.id?.replace("#", "") || order?.orderNumber || "";

  return (
    <div className="min-h-screen py-10 sm:py-16 bg-[#E8E4DC]">
      <Container>
        {/* Celebration Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="relative inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.2]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-3 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Order Confirmed & In Production</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#141414] tracking-tight mb-3">
            Thank You for Your Order!
          </h1>
          <p className="text-xs sm:text-sm text-[#5A5A5E] max-w-lg mx-auto leading-relaxed">
            Your pieces have been allocated. A confirmation receipt has been dispatched to{" "}
            <strong className="text-[#141414] font-semibold">{order?.customerEmail}</strong>.
          </p>
        </div>

        {/* Liquid Glass Order Invoice Card */}
        <div
          className="max-w-4xl mx-auto rounded-[2.5rem] p-6 sm:p-10 text-[#141414] shadow-2xl relative mb-10 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0.75) 100%)",
            backdropFilter: "blur(32px) saturate(190%)",
            WebkitBackdropFilter: "blur(32px) saturate(190%)",
            border: "1.5px solid rgba(255, 255, 255, 0.9)",
            boxShadow:
              "inset 0 1px 2px 0 #ffffff, 0 24px 60px -12px rgba(0, 0, 0, 0.12), 0 8px 24px -4px rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Top Meta Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-black/[0.08] gap-4 mb-8">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A5A5E] block">
                Order Reference
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xl sm:text-2xl font-black text-[#141414]">
                  {order?.id}
                </span>
                {(() => {
                  const statusUpper = (order?.status || "CONFIRMED").toUpperCase();
                  const isCancelled = statusUpper === "CANCELLED";
                  let badgeCls = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  if (isCancelled) badgeCls = "bg-rose-100 text-rose-800 border-rose-200";
                  else if (statusUpper === "SHIPPED") badgeCls = "bg-cyan-100 text-cyan-800 border-cyan-200";
                  else if (statusUpper === "PROCESSING" || statusUpper === "PACKED") badgeCls = "bg-amber-100 text-amber-800 border-amber-200";

                  return (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${badgeCls}`}>
                      {order?.status || "Confirmed"}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(() => {
                const statusUpper = (order?.status || "CONFIRMED").toUpperCase();
                const isCancellable = !["SHIPPED", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"].includes(statusUpper);
                if (!isCancellable) return null;
                return (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelModal(true)}
                    className="rounded-full text-xs font-semibold py-2 px-4 border-rose-200 text-rose-600 hover:bg-rose-50 gap-1.5 cursor-pointer print:hidden"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </Button>
                );
              })()}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="rounded-full text-xs font-semibold py-2 px-4 border-black/15 hover:bg-black/5 gap-2 cursor-pointer print:hidden"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </Button>
              <Link
                href={`/orders/${orderNum}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#141414] text-white hover:bg-black text-xs font-semibold transition-colors shadow-sm cursor-pointer print:hidden"
              >
                <span>Live Tracking</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 3-Column Logistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-black/[0.08] mb-8">
            {/* Delivery Info */}
            <div className="p-4 rounded-2xl bg-white/50 border border-white/80">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#141414] mb-2">
                <Truck className="w-4 h-4 text-brand-primary" />
                <span>Shipping Method</span>
              </div>
              <p className="text-xs font-semibold text-[#141414]">
                {order?.shippingMethod || "Priority Air Dispatch"}
              </p>
              <p className="text-[11px] text-[#5A5A5E] mt-1">
                Estimated Delivery: 3–5 Business Days
              </p>
            </div>

            {/* Address Info */}
            <div className="p-4 rounded-2xl bg-white/50 border border-white/80">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#141414] mb-2">
                <MapPin className="w-4 h-4 text-brand-primary" />
                <span>Delivery Address</span>
              </div>
              <p className="text-xs font-semibold text-[#141414] truncate">
                {order?.shippingAddress?.name || order?.customerName}
              </p>
              <p className="text-[11px] text-[#5A5A5E] mt-0.5 line-clamp-2">
                {order?.shippingAddress?.address}, {order?.shippingAddress?.cityStateZip}
              </p>
              {order?.shippingAddress?.phone && (
                <p className="text-[11px] text-[#5A5A5E] mt-0.5">
                  Ph: {order.shippingAddress.phone}
                </p>
              )}
            </div>

            {/* Payment Info */}
            <div className="p-4 rounded-2xl bg-white/50 border border-white/80">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#141414] mb-2">
                <CreditCard className="w-4 h-4 text-brand-primary" />
                <span>Payment Details</span>
              </div>
              <p className="text-xs font-semibold text-[#141414]">
                {order?.paymentMethod || "Cards & UPI"}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Payment Authorized & Secure</span>
              </div>
            </div>
          </div>

          {/* Itemized Garments Table */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A5A5E] mb-4">
              Ordered Items ({(order?.items || []).length})
            </h3>
            <div className="space-y-3">
              {(order?.items || []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/60 border border-white/90 hover:bg-white/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-14 h-18 rounded-xl overflow-hidden bg-black/5 shrink-0">
                      <StorefrontImage
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#141414] truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#5A5A5E] mt-0.5">
                        {item.color ? `Color: ${item.color}` : ""}{" "}
                        {item.size ? `• Size: ${item.size}` : ""}{" "}
                        • Qty: {item.quantity || 1}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <span className="text-xs sm:text-sm font-bold text-[#141414]">
                      {formatPrice(item.price * (item.quantity || 1))}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[10px] text-[#5A5A5E] block">
                        {formatPrice(item.price)} each
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown Receipt */}
          <div className="pt-6 border-t border-black/[0.08] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1 text-xs text-[#5A5A5E]">
              <p>Ordered on {order?.date}</p>
              <p>All prices are inclusive of applicable GST.</p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#5A5A5E]">
                <span>Subtotal</span>
                <span>{formatPrice(order?.subtotal || order?.total || 0)}</span>
              </div>
              <div className="flex justify-between text-[#5A5A5E]">
                <span>Delivery / Shipping</span>
                <span>{order?.shippingFee > 0 ? formatPrice(order.shippingFee) : "FREE"}</span>
              </div>
              {order?.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Promotion Applied</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-black/[0.08] flex justify-between text-sm sm:text-base font-black text-[#141414]">
                <span>Total Paid</span>
                <span>{formatPrice(order?.total || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Row */}
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#141414] hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:-translate-y-0.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>

          <Link
            href="/account?tab=orders"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/80 hover:bg-white text-[#141414] border border-black/15 text-xs font-bold uppercase tracking-wider transition-all shadow-xs hover:-translate-y-0.5"
          >
            <Package className="w-4 h-4" />
            <span>View All My Orders</span>
          </Link>
        </div>
      </Container>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <CancelOrderModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          order={order}
          onSuccess={(updated) => {
            setOrder((prev) => ({ ...prev, status: "CANCELLED" }));
          }}
        />
      )}
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#141414] border-t-transparent animate-spin" />
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
