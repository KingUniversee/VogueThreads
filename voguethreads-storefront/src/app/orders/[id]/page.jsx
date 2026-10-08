"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Truck,
  Package,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { CancelOrderModal } from "@/components/orders/cancel-order-modal";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

export default function OrderTrackingPage() {
  const params = useParams();
  const rawId = params?.id ? decodeURIComponent(params.id) : "";
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchTrackingOrder() {
      try {
        let foundOrder = null;

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
                  : "Recently",
                status: o.status || "CONFIRMED",
                total: o.pricing?.grandTotal || 0,
                subtotal: o.pricing?.subtotal || 0,
                shippingFee: o.pricing?.shippingFee || 0,
                discount: o.pricing?.discountAmount || 0,
                customerName: o.customerDetails?.name || "Customer",
                customerEmail: o.customerDetails?.email || "",
                customerPhone: o.customerDetails?.phone || "",
                fulfillment: o.fulfillment || {},
                shippingAddress: {
                  name: o.shippingAddress?.fullName || o.customerDetails?.name || "Customer",
                  address: o.shippingAddress?.addressLine1 || "",
                  cityStateZip: `${o.shippingAddress?.city || ""}, ${o.shippingAddress?.state || ""} - ${o.shippingAddress?.pinCode || ""}`.trim().replace(/^,|-$/g, ""),
                  phone: o.shippingAddress?.phone || o.customerDetails?.phone || "",
                },
                items: (o.items || []).map((it, idx) => ({
                  id: it.variantId || `${idx}`,
                  title: it.title,
                  price: it.unitPrice || it.price,
                  quantity: it.quantity || 1,
                  color: it.color || "Standard",
                  size: it.size || "M",
                  image: it.image || "",
                })),
              };
            } else {
              if (isMounted) {
                setErrorMessage(apiData.error || "Order not found or access denied.");
              }
            }
          } catch (e) {
            console.warn("Could not fetch order from MongoDB API:", e);
            if (isMounted) {
              setErrorMessage("Unable to retrieve order details.");
            }
          }
        } else {
          if (isMounted) {
            setErrorMessage("Invalid order reference specified.");
          }
        }

        if (isMounted) setOrder(foundOrder);
      } catch (err) {
        console.warn("Order load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchTrackingOrder();

    return () => {
      isMounted = false;
    };
  }, [rawId]);

  const carrier = order?.fulfillment?.carrier || "Delhivery Express";
  const awb = order?.fulfillment?.awbNumber || "";
  const trackingUrl = order?.fulfillment?.trackingUrl || (awb ? `https://www.delhivery.com/track/package/${awb}` : "");

  const handleTrackCourier = () => {
    if (trackingUrl) {
      window.open(trackingUrl, "_blank", "noopener,noreferrer");
    } else {
      toast.info(`Package awaiting carrier pickup by ${carrier}. Tracking will activate upon dispatch.`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-vt-offwhite">
        <div className="w-8 h-8 border-2 border-vt-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-vt-offwhite py-12">
        <Container>
          <div className="max-w-md mx-auto p-8 rounded-3xl bg-white border border-vt-stone text-center shadow-card">
            <h2 className="font-display text-xl font-medium text-vt-black mb-2">Order Access Protected</h2>
            <p className="text-xs sm:text-sm text-vt-muted mb-6 leading-relaxed">
              {errorMessage || "You do not have permission to view this order, or it does not exist. Please sign in with the account used to place the order."}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href={`/login?callbackUrl=/orders/${encodeURIComponent(rawId)}`}>
                <Button size="sm" variant="primary">Sign In</Button>
              </Link>
              <Link href="/account">
                <Button size="sm" variant="outline">My Account</Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const timelineSteps = [
    { name: "Placed", date: order?.date || "Today", completed: true },
    { name: "Confirmed", date: order?.date || "Today", completed: true },
    {
      name: "Packed",
      date: order?.status === "Shipped" || order?.status === "Delivered" ? "Completed" : "In Progress",
      completed: order?.status === "Shipped" || order?.status === "Delivered",
    },
    {
      name: "Shipped",
      date: order?.status === "Shipped" || order?.status === "Delivered" ? "In Transit" : "Pending",
      completed: order?.status === "Shipped" || order?.status === "Delivered",
    },
    {
      name: "Out for Delivery",
      date: order?.status === "Delivered" ? "Completed" : "Pending",
      completed: order?.status === "Delivered",
    },
    {
      name: "Delivered",
      date: order?.status === "Delivered" ? "Delivered" : "Pending",
      completed: order?.status === "Delivered",
    },
  ];

  const address = order?.shippingAddress || {};
  const recipientName = address.name || address.fullName || order?.customerName || "Customer";
  const street = address.address || address.addressLine1 || "";
  const cityZip = address.cityStateZip || (address.city ? `${address.city}, ${address.state ? address.state + " " : ""}${address.pinCode || ""}` : "");
  const phone = address.phone || order?.customerPhone || "";
  const items = order?.items || [];
  const subtotal = order?.subtotal || items.reduce((acc, i) => acc + (i.price * (i.quantity || 1)), 0);
  const shippingFee = order?.shippingFee !== undefined ? order.shippingFee : subtotal > 999 ? 0 : 49;
  const discount = order?.discount || 0;
  const total = order?.total || Math.max(0, subtotal - discount + shippingFee);

  return (
    <div className="min-h-screen py-8 sm:py-12 bg-vt-offwhite">
      <Container>
        {/* Back Link */}
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-xs font-semibold text-vt-graphite hover:text-vt-black transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Account</span>
        </Link>

        {/* Order Header */}
        {(() => {
          const statusUpper = (order?.status || "CONFIRMED").toUpperCase();
          const isCancellable = !["SHIPPED", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"].includes(statusUpper);
          const isCancelled = statusUpper === "CANCELLED";

          let statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
          if (isCancelled) {
            statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
          } else if (statusUpper === "SHIPPED") {
            statusBadgeClass = "bg-cyan-50 text-cyan-700 border-cyan-200";
          } else if (statusUpper === "PROCESSING" || statusUpper === "PACKED") {
            statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
          }

          return (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-vt-stone mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-2xl sm:text-3xl font-medium text-vt-black">
                      Order {order?.id}
                    </h1>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}>
                      ● {order?.status || "Confirmed"}
                    </span>
                  </div>
                  <p className="text-xs text-vt-muted mt-1">Placed on {order?.date}</p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  {isCancellable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCancelModal(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Order</span>
                    </Button>
                  )}
                  <Link
                    href={`/order-success?orderId=${rawId.replace("#", "")}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-black/15 hover:bg-black/5 text-xs font-semibold text-vt-black transition-colors cursor-pointer"
                  >
                    <span>View Invoice Receipt</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {isCancelled && (
                <div className="p-5 rounded-3xl bg-rose-50/80 border border-rose-200/80 flex items-start gap-3.5 text-rose-950 mb-8 shadow-xs">
                  <div className="w-9 h-9 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                    <XCircle className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-bold text-sm text-rose-900">This order has been cancelled</h3>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      Cancellation has been recorded in the database. Any eligible prepaid balance will be returned to the payment source within 3–5 banking days.
                    </p>
                  </div>
                </div>
              )}
            </>
          );
        })()}

        {/* Stepper Timeline */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-vt-stone shadow-card mb-8">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 relative">
            {timelineSteps.map((step, idx) => (
              <div key={step.name} className="flex flex-col items-center text-center relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 ${
                    step.completed
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-vt-stone text-vt-muted border border-vt-border"
                  }`}
                >
                  {step.completed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span className="text-xs font-semibold text-vt-black">{step.name}</span>
                <span className="text-[10px] text-vt-muted mt-0.5">{step.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Cards */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tracking Details */}
            <div className="p-6 rounded-3xl bg-white border border-vt-stone shadow-card space-y-4">
              <h2 className="font-display text-lg font-medium text-vt-black">Tracking Details</h2>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-vt-stone/30 border border-vt-border gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-vt-muted block">
                    AWB Number
                  </span>
                  <span className="font-mono font-bold text-sm text-vt-black">{awb || "Pending Assignment"}</span>
                  <p className="text-xs text-vt-graphite mt-1">Carrier: {carrier}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleTrackCourier}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  Track on {carrier.split(" ")[0] || "Carrier"} <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="p-6 rounded-3xl bg-white border border-vt-stone shadow-card space-y-2">
              <h2 className="font-display text-lg font-medium text-vt-black mb-3">Shipping Address</h2>
              <p className="text-sm font-semibold text-vt-black">{recipientName}</p>
              <p className="text-xs text-vt-graphite">{street}</p>
              <p className="text-xs text-vt-graphite">{cityZip}</p>
              <p className="text-xs text-vt-muted mt-1">{phone}</p>
            </div>
          </div>

          {/* Right Summary Card */}
          <div className="lg:col-span-5">
            <div className="p-6 rounded-3xl bg-white border border-vt-stone shadow-card space-y-4">
              <h2 className="font-display text-lg font-medium text-vt-black border-b border-vt-stone pb-3">
                Items in this Order ({items.length})
              </h2>

              <div className="space-y-3 divide-y divide-vt-stone">
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="pt-3 first:pt-0 flex items-center gap-3">
                    <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-vt-stone/30 shrink-0">
                      <StorefrontImage src={item.image} alt={item.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-vt-black truncate">{item.title}</h3>
                      <p className="text-[11px] text-vt-muted">Qty: {item.quantity || 1}</p>
                      <span className="text-xs font-bold text-vt-black">{formatPrice(item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-vt-stone space-y-2 text-xs">
                <div className="flex justify-between text-vt-graphite">
                  <span>Subtotal</span>
                  <span className="text-vt-black font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-vt-graphite">
                  <span>Shipping</span>
                  <span className="text-vt-black font-semibold">{shippingFee === 0 ? "FREE" : formatPrice(shippingFee)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount</span>
                    <span>- {formatPrice(discount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-vt-stone flex justify-between text-sm font-bold text-vt-black">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
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
