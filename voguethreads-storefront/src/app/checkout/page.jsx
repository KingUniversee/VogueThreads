"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ShieldCheck,
  Truck,
  CreditCard,
  Lock,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
  MapPin,
  Plus,
  Building,
  Home,
  Check,
  X,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

// Steps definition matching Screen 5 in Mockup
const STEPS = [
  { id: 1, name: "Address" },
  { id: 2, name: "Shipping" },
  { id: 3, name: "Payment" },
  { id: 4, name: "Review" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
    type: "Home",
  });

  const [shippingMethod, setShippingMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cartItems, setCartItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  useEffect(() => {
    try {
      const savedCoupon = JSON.parse(localStorage.getItem("vt_applied_coupon") || "null");
      if (savedCoupon && savedCoupon.code) {
        setAppliedCoupon(savedCoupon.code);
        setDiscountAmount(Number(savedCoupon.discountAmount) || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      // 1. Verify and load active customer strictly from server-side session
      fetch("/api/auth/me")
        .then((res) => {
          if (!res.ok) {
            setUser(null);
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data?.success && data.customer) {
            const customer = data.customer;
            setUser(customer);
            if (customer.addresses && customer.addresses.length > 0) {
              const addrs = customer.addresses.map((a, i) => ({
                id: a.id || `addr-${Date.now()}-${i}`,
                name: a.fullName || customer.name || "Customer",
                phone: a.phone || customer.phone || "",
                address: a.addressLine1 || "",
                city: a.city || "",
                state: a.state || "",
                pinCode: a.pinCode || "",
                cityStateZip: `${a.city || ""}, ${a.state || ""} - ${a.pinCode || ""}`.trim().replace(/^,|-$/g, ""),
                type: a.type === "BILLING" ? "Work" : "Home",
              }));
              setAddresses(addrs);
              setSelectedAddress(addrs[0]?.id || "");
            } else {
              setShowAddAddress(true);
            }
            setNewAddress((prev) => ({
              ...prev,
              name: customer.name || "",
              phone: customer.phone || "",
            }));
          } else {
            setUser(null);
          }
        })
        .catch(() => setUser(null));

      // 2. Load dynamic cart items
      const saved = JSON.parse(localStorage.getItem("vt_cart") || "[]");
      if (saved.length > 0) {
        setCartItems(
          saved.map((item, idx) => ({
            id: item.sku || item.id || `cart-${idx}`,
            title: item.title,
            price: item.price,
            quantity: item.quantity || 1,
            color: item.color || "Standard",
            size: item.size || "M",
            image: item.image || "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400",
          }))
        );
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.warn("Checkout init error:", err);
      setCartItems([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const subtotal = cartItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const discount = Math.max(0, Number(discountAmount) || 0);
  const shippingFee = shippingMethod === "express" ? 149 : subtotal >= 999 || subtotal === 0 ? 0 : 49;
  const codFee = paymentMethod === "cod" ? 49 : 0;
  const total = Math.max(0, subtotal - discount + shippingFee + codFee);

  const activeAddress = addresses.find((a) => a.id === selectedAddress) || addresses[0] || null;

  const handleSaveAddress = (e) => {
    e.preventDefault();
    if (!newAddress.name.trim() || !newAddress.address.trim() || !newAddress.city.trim() || !newAddress.pinCode.trim()) {
      toast.error("Please fill in full name, street address, city, and PIN code");
      return;
    }

    const created = {
      id: `addr-${Date.now()}`,
      type: newAddress.type || "Home",
      name: newAddress.name.trim(),
      address: newAddress.address.trim(),
      city: newAddress.city.trim(),
      state: newAddress.state.trim() || "Maharashtra",
      pinCode: newAddress.pinCode.trim(),
      cityStateZip: `${newAddress.city.trim()}, ${newAddress.state.trim()} - ${newAddress.pinCode.trim()}`,
      phone: newAddress.phone.trim() || user?.phone || "",
    };

    const updated = [created, ...addresses];
    setAddresses(updated);
    setSelectedAddress(created.id);
    setShowAddAddress(false);

    if (user?.email) {
      try {
        localStorage.setItem(`vt_addresses_${user.email}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    toast.success("New shipping address added and selected!");
  };

  const handleNext = async (e) => {
    e.preventDefault();
    if (currentStep < 4) {
      if (currentStep === 1 && !activeAddress) {
        toast.error("Delivery address required", {
          description: "Please enter or select a delivery address before proceeding.",
        });
        setShowAddAddress(true);
        return;
      }
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      if (isSubmitting) return;

      if (!user?.email) {
        toast.error("Please sign in to place your order", {
          description: "An active account is required to place and track your orders.",
        });
        router.push("/login?callbackUrl=/checkout");
        return;
      }

      if (!activeAddress) {
        toast.error("Delivery address required", {
          description: "Please select or add a shipping address before completing your order.",
        });
        setCurrentStep(1);
        setShowAddAddress(true);
        return;
      }

      const customerEmail = user.email;
      const customerName = activeAddress?.name || user.name || "Customer";
      const customerPhone = activeAddress?.phone || user.phone || "";

      if (!customerPhone) {
        toast.error("Contact phone number required", {
          description: "Please provide a valid phone number for courier dispatch.",
        });
        setCurrentStep(1);
        return;
      }

      setIsSubmitting(true);

      // Prepare payload for MongoDB order creation
      const orderPayload = {
        customerDetails: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        shippingAddress: {
          fullName: customerName,
          phone: customerPhone,
          addressLine1: activeAddress.address || "Standard Address",
          addressLine2: "",
          city: activeAddress.city || "Mumbai",
          state: activeAddress.state || "Maharashtra",
          pinCode: activeAddress.pinCode || "400001",
          country: "IN",
        },
        items: cartItems.map((item, idx) => ({
          title: item.title,
          sku: item.id || `VT-ITEM-${idx}`,
          unitPrice: item.price,
          quantity: item.quantity || 1,
          color: item.color || "Standard",
          size: item.size || "M",
          image: item.image,
        })),
        pricing: {
          subtotal,
          discountAmount: discount,
          couponCode: appliedCoupon || "",
          shippingFee,
          codFee: paymentMethod === "cod" ? 49 : 0,
          grandTotal: total,
        },
        payment: {
          method: paymentMethod === "card" ? "CARD" : paymentMethod === "razorpay" ? "RAZORPAY" : "COD",
          status: paymentMethod === "cod" ? "PENDING" : "PAID",
          transactionId: `TXN_${Date.now()}`,
        },
      };

      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });

        const data = await response.json();

        if (!response.ok || !data.success || !data.order) {
          setIsSubmitting(false);
          toast.error(data.error || "Failed to place order. Please try again.");
          return;
        }

        const realOrderNum = data.orderNumber || data.order.orderNumber;
        const createdDate = data.order.createdAt ? new Date(data.order.createdAt) : new Date();
        const orderDate = createdDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        const clientOrder = {
          id: `#${realOrderNum}`,
          orderNumber: realOrderNum,
          date: orderDate,
          status: data.order.status || "Confirmed",
          total: data.order.pricing?.grandTotal || total,
          subtotal: data.order.pricing?.subtotal || subtotal,
          shippingFee: data.order.pricing?.shippingFee || shippingFee,
          discount: data.order.pricing?.discountAmount || 0,
          items: cartItems,
          shippingAddress: activeAddress,
          shippingMethod: shippingMethod === "express" ? "Priority Air Dispatch" : "Standard Courier Delivery",
          paymentMethod: paymentMethod === "card" ? "Cards & UPI" : paymentMethod === "razorpay" ? "Razorpay" : "Cash on Delivery",
          customerEmail,
          customerName,
        };

        if (user?.email) {
          const userOrders = JSON.parse(localStorage.getItem(`vt_orders_${user.email}`) || "[]");
          localStorage.setItem(`vt_orders_${user.email}`, JSON.stringify([clientOrder, ...userOrders]));
        }

        // Clean up client cart & applied coupon only after verified MongoDB write
        try {
          localStorage.removeItem("vt_cart");
          localStorage.removeItem("vt_applied_coupon");
          window.dispatchEvent(new Event("vt_cart_updated"));
          fetch("/api/cart", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: [] }),
          }).catch((e) => console.warn("Clear server cart warning:", e));
        } catch {
          // ignore
        }

        setIsSubmitting(false);
        toast.success(`Order #${realOrderNum} confirmed!`, {
          description: `Order successfully placed and registered for ${customerName}.`,
        });
        router.push(`/order-success?orderId=${realOrderNum}`);
      } catch (apiErr) {
        console.error("Order placement exception:", apiErr);
        setIsSubmitting(false);
        toast.error("Unable to submit order to server. Please check your network and retry.");
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-vt-offwhite">
        <div className="w-8 h-8 border-2 border-vt-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 bg-vt-offwhite">
        <Container>
          <div className="max-w-md mx-auto text-center p-8 sm:p-10 rounded-3xl bg-white border border-vt-stone shadow-card">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="font-display text-2xl font-bold text-vt-black tracking-tight mb-2">
              Your Shopping Bag is Empty
            </h2>
            <p className="text-xs sm:text-sm text-vt-muted mb-6 leading-relaxed">
              Explore our architectural luxury collections and add items to your cart before proceeding to checkout.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-vt-black text-white text-xs font-bold uppercase tracking-wider hover:bg-black/80 transition-colors shadow-md"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12 bg-vt-offwhite">
      <Container>
        {/* Step Stepper Header (Matches Screen 5) */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-vt-stone -translate-y-1/2 -z-0" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-vt-black -translate-y-1/2 -z-0 transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />

            {STEPS.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                    disabled={step.id > currentStep}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      isCompleted
                        ? "bg-vt-black text-white shadow-md cursor-pointer"
                        : isCurrent
                        ? "bg-vt-black text-white ring-4 ring-vt-black/10 shadow-lg scale-110"
                        : "bg-white border-2 border-vt-stone text-vt-muted"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                  </button>
                  <span
                    className={`text-[11px] font-semibold mt-2 uppercase tracking-wider ${
                      isCurrent
                        ? "text-vt-black"
                        : isCompleted
                        ? "text-vt-graphite"
                        : "text-vt-muted"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Grid: Left Steps + Right Sticky Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Active Step Panel */}
          <div className="lg:col-span-7 xl:col-span-8">
            <div className="rounded-3xl bg-white border border-vt-stone p-6 sm:p-8 shadow-card">
              <form onSubmit={handleNext}>
                {/* STEP 1: Shipping Address (Matches Screen 5) */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-vt-stone pb-4">
                      <div>
                        <h2 className="font-display text-xl sm:text-2xl font-medium text-vt-black">
                          Shipping Address
                        </h2>
                        <p className="text-xs text-vt-muted mt-0.5">
                          {user ? `Delivering to ${user.name} (${user.email})` : "Select or add the delivery address for your order."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(!showAddAddress)}
                        className="text-xs font-semibold text-vt-black hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showAddAddress ? "Cancel" : "+ Add New Address"}
                      </button>
                    </div>

                    {/* Inline Add Address Form */}
                    {showAddAddress && (
                      <div className="p-5 rounded-2xl bg-vt-stone/30 border border-vt-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-xs uppercase tracking-wider text-vt-black">
                            Add New Delivery Address
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowAddAddress(false)}
                            className="text-vt-muted hover:text-vt-black"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-vt-graphite block mb-1">
                              Recipient Name
                            </label>
                            <input
                              type="text"
                              required
                              value={newAddress.name}
                              onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
                              placeholder="Full Name"
                              className="w-full h-10 px-3 rounded-xl border border-vt-border bg-white text-xs focus:ring-1 focus:ring-vt-black outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-vt-graphite block mb-1">
                              Contact Phone
                            </label>
                            <input
                              type="tel"
                              value={newAddress.phone}
                              onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                              placeholder="+91 98765 43210"
                              className="w-full h-10 px-3 rounded-xl border border-vt-border bg-white text-xs focus:ring-1 focus:ring-vt-black outline-none"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-vt-graphite block mb-1">
                              Street Address / Apartment
                            </label>
                            <input
                              type="text"
                              required
                              value={newAddress.address}
                              onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                              placeholder="House/Flat No., Street, Area"
                              className="w-full h-10 px-3 rounded-xl border border-vt-border bg-white text-xs focus:ring-1 focus:ring-vt-black outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-vt-graphite block mb-1">
                              City
                            </label>
                            <input
                              type="text"
                              required
                              value={newAddress.city}
                              onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                              placeholder="City"
                              className="w-full h-10 px-3 rounded-xl border border-vt-border bg-white text-xs focus:ring-1 focus:ring-vt-black outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-vt-graphite block mb-1">
                              State
                            </label>
                            <input
                              type="text"
                              value={newAddress.state}
                              onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                              placeholder="State"
                              className="w-full h-10 px-3 rounded-xl border border-vt-border bg-white text-xs focus:ring-1 focus:ring-vt-black outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-vt-graphite block mb-1">
                              PIN Code
                            </label>
                            <input
                              type="text"
                              required
                              value={newAddress.pinCode}
                              onChange={(e) => setNewAddress({ ...newAddress, pinCode: e.target.value })}
                              placeholder="e.g. 400001"
                              className="w-full h-10 px-3 rounded-xl border border-vt-border bg-white text-xs focus:ring-1 focus:ring-vt-black outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-vt-graphite block mb-1">
                              Address Type
                            </label>
                            <select
                              value={newAddress.type}
                              onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value })}
                              className="w-full h-10 px-3 rounded-xl border border-vt-border bg-white text-xs focus:ring-1 focus:ring-vt-black outline-none"
                            >
                              <option value="Home">Home</option>
                              <option value="Work">Work</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddAddress(false)}
                            className="px-4 py-2 text-xs font-semibold text-vt-graphite hover:text-vt-black"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveAddress}
                            className="px-5 py-2 rounded-xl bg-vt-black text-white text-xs font-bold uppercase tracking-wider hover:bg-black/80"
                          >
                            Save & Select Address
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Saved Addresses List */}
                    <div className="space-y-3">
                      {addresses.map((addr) => {
                        const isSelected = selectedAddress === addr.id;

                        return (
                          <label
                            key={addr.id}
                            className={`flex items-start justify-between p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? "border-vt-black bg-vt-stone/30 ring-1 ring-vt-black"
                                : "border-vt-stone hover:border-vt-graphite bg-white"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="address"
                                checked={isSelected}
                                onChange={() => setSelectedAddress(addr.id)}
                                className="mt-1 text-vt-black focus:ring-vt-black"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-vt-black">
                                    {addr.type || "Delivery Address"}
                                  </span>
                                  {addr.type === "Home" && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-vt-black/10 text-vt-black">
                                      Primary
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-medium text-vt-black mt-1">{addr.name}</p>
                                <p className="text-xs text-vt-graphite mt-0.5">{addr.address}</p>
                                <p className="text-xs text-vt-graphite">{addr.cityStateZip}</p>
                                {addr.phone && <p className="text-xs text-vt-muted mt-1">{addr.phone}</p>}
                              </div>
                            </div>

                            <span className="text-[11px] font-semibold text-vt-muted">
                              {isSelected ? "Selected" : "Select"}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {!showAddAddress && (
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(true)}
                        className="w-full py-3.5 px-4 rounded-2xl border border-dashed border-vt-border hover:border-vt-black text-xs font-semibold uppercase tracking-wider text-vt-graphite hover:text-vt-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Add Another Delivery Address
                      </button>
                    )}
                  </div>
                )}

                {/* STEP 2: Shipping Options */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="border-b border-vt-stone pb-4">
                      <h2 className="font-display text-xl sm:text-2xl font-medium text-vt-black">
                        Delivery Method
                      </h2>
                      <p className="text-xs text-vt-muted mt-0.5">
                        Handled with tamper-evident luxury garment packaging.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label
                        className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
                          shippingMethod === "standard"
                            ? "border-vt-black bg-vt-stone/30 ring-1 ring-vt-black"
                            : "border-vt-stone hover:border-vt-graphite bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingMethod === "standard"}
                            onChange={() => setShippingMethod("standard")}
                            className="text-vt-black focus:ring-vt-black"
                          />
                          <div>
                            <span className="font-semibold text-sm text-vt-black">
                              Standard Courier Delivery
                            </span>
                            <p className="text-xs text-vt-muted mt-0.5">
                              Estimated 3-5 business days via Delhivery Express
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-vt-black">₹99</span>
                      </label>

                      <label
                        className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all ${
                          shippingMethod === "express"
                            ? "border-vt-black bg-vt-stone/30 ring-1 ring-vt-black"
                            : "border-vt-stone hover:border-vt-graphite bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingMethod === "express"}
                            onChange={() => setShippingMethod("express")}
                            className="text-vt-black focus:ring-vt-black"
                          />
                          <div>
                            <span className="font-semibold text-sm text-vt-black">
                              Priority Air Dispatch
                            </span>
                            <p className="text-xs text-vt-muted mt-0.5">
                              1-2 business days with priority transit protection
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-sm text-vt-black">₹149</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* STEP 3: Payment Method */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="border-b border-vt-stone pb-4">
                      <h2 className="font-display text-xl sm:text-2xl font-medium text-vt-black">
                        Payment Method
                      </h2>
                      <p className="text-xs text-vt-muted mt-0.5">
                        Encrypted 256-bit payment gateways.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "card", label: "Cards & UPI", icon: CreditCard },
                        { id: "razorpay", label: "Razorpay", icon: ShieldCheck },
                        { id: "cod", label: "Cash on Delivery", icon: Truck },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPaymentMethod(item.id)}
                          className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                            paymentMethod === item.id
                              ? "border-vt-black bg-vt-black text-white font-semibold shadow-sm"
                              : "border-vt-stone text-vt-graphite hover:text-vt-black bg-white"
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-xs">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {paymentMethod === "card" && (
                      <div className="p-4 rounded-2xl bg-vt-stone/30 border border-vt-border space-y-2 text-xs">
                        <p className="font-semibold text-vt-black">Instant UPI / Credit / Debit</p>
                        <p className="text-vt-graphite">
                          Supports Google Pay, PhonePe, Paytm, Visa, Mastercard, and Net Banking.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: Review */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="border-b border-vt-stone pb-4">
                      <h2 className="font-display text-xl sm:text-2xl font-medium text-vt-black">
                        Review & Complete Order
                      </h2>
                      <p className="text-xs text-vt-muted mt-0.5">
                        Confirm order destination and payment mode before dispatch.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-vt-stone/30 border border-vt-stone space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-vt-black uppercase tracking-wider">
                        <span>Delivery Address</span>
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-vt-graphite hover:underline text-[11px] cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                      {activeAddress ? (
                        <>
                          <p className="font-semibold text-sm text-vt-black">{activeAddress.name}</p>
                          <p className="text-vt-graphite">{activeAddress.address}</p>
                          <p className="text-vt-graphite">{activeAddress.cityStateZip}</p>
                          {activeAddress.phone && <p className="text-vt-muted mt-1">{activeAddress.phone}</p>}
                        </>
                      ) : (
                        <p className="text-xs text-rose-600 font-medium">Please add a shipping address.</p>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-vt-stone/20 border border-vt-stone/60 space-y-1 text-xs">
                      <span className="font-bold uppercase tracking-wider text-vt-graphite text-[10px] block">
                        Delivery Method
                      </span>
                      <p className="font-semibold text-vt-black">
                        {shippingMethod === "express" ? "Priority Air Dispatch (1-2 Days)" : "Standard Courier Delivery (3-5 Days)"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Stepper Buttons */}
                <div className="flex items-center justify-between pt-8 mt-8 border-t border-vt-stone">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleBack}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </Button>
                  ) : (
                    <Link href="/cart">
                      <Button variant="ghost" size="sm" className="text-xs text-vt-graphite">
                        Return to Bag
                      </Button>
                    </Link>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={isSubmitting}
                    className="min-w-[200px] rounded-xl font-bold uppercase tracking-wider text-xs"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing Order...
                      </span>
                    ) : (
                      <>
                        {currentStep === 1 && (
                          <span className="flex items-center gap-2">
                            Continue to Shipping <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                        {currentStep === 2 && (
                          <span className="flex items-center gap-2">
                            Continue to Payment <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                        {currentStep === 3 && (
                          <span className="flex items-center gap-2">
                            Review Order <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                        {currentStep === 4 && (
                          <span className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5" /> Place Order ({formatPrice(total)})
                          </span>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Sticky Order Summary (Matches Screen 5) */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="rounded-3xl bg-white border border-vt-stone p-6 shadow-card sticky top-28 space-y-6">
              <h3 className="font-display text-lg font-medium text-vt-black border-b border-vt-stone pb-3">
                Order Summary
              </h3>

              {/* Items Mini List */}
              <div className="space-y-3 divide-y divide-vt-stone">
                {cartItems.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                    <div className="relative w-14 h-16 rounded-xl overflow-hidden bg-vt-stone/30 shrink-0">
                      <StorefrontImage src={item.image} alt={item.title} fill className="object-cover" />
                      <span className="absolute top-0 right-0 w-4 h-4 bg-vt-black text-white text-[9px] font-bold flex items-center justify-center rounded-bl-md">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-vt-black truncate">{item.title}</h4>
                      <span className="text-xs font-bold text-vt-black">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs border-t border-vt-stone pt-4">
                <div className="flex justify-between text-vt-graphite">
                  <span>Subtotal</span>
                  <span className="text-vt-black font-semibold">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-vt-graphite">
                  <span>Shipping</span>
                  <span className="text-vt-black font-semibold">{formatPrice(shippingFee)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span>- {formatPrice(discount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-vt-black border-t border-vt-stone pt-3">
                  <div>
                    <span>Total</span>
                    <p className="text-[10px] text-vt-muted font-normal">Incl. of all taxes</p>
                  </div>
                  <span className="text-base font-bold">{formatPrice(total)}</span>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="pt-4 border-t border-vt-stone flex items-center gap-3 text-vt-graphite">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-[11px] leading-tight">
                  Guaranteed safe 256-bit encryption checkout. Free returns on all domestic orders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
