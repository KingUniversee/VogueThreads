"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Package,
  Heart,
  MapPin,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  Sparkles,
  ExternalLink,
  Tag,
  Star,
  Shield,
  Plus,
  ArrowRight,
  Mail,
  Phone,
  Edit2,
  Save,
  ShoppingBag,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { LogoutWarningModal } from "@/components/auth/logout-warning-modal";
import { CancelOrderModal } from "@/components/orders/cancel-order-modal";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

export default function AccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic user data
  const [orders, setOrders] = useState([]);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [addresses, setAddresses] = useState([]);
  
  // Profile edit state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Email change state
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false);
  const [emailChangeSuccessMessage, setEmailChangeSuccessMessage] = useState("");

  // New address state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    pinCode: "",
    type: "SHIPPING",
  });

  // Load active user session & live data
  useEffect(() => {
    let isMounted = true;

    // Check for email change or verification query status
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("emailChanged") === "true") {
        toast.success("Your email address has been successfully updated!");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.get("error")) {
        toast.error(decodeURIComponent(params.get("error")));
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    async function loadAccountData() {
      try {
        const savedUser = JSON.parse(localStorage.getItem("vt_user") || "null");
        if (savedUser && savedUser.email) {
          setUser(savedUser);
          setEditName(savedUser.name || "");
          setEditPhone(savedUser.phone || "");

          const userOrders = JSON.parse(
            localStorage.getItem(`vt_orders_${savedUser.email}`) || "[]"
          );
          setOrders(userOrders);

          if (localStorage.getItem("vt_orders")) {
            localStorage.removeItem("vt_orders");
          }

          const savedWishlist = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
          setWishlistCount(savedWishlist.length);

          const savedAddresses = JSON.parse(
            localStorage.getItem(`vt_addresses_${savedUser.email}`) || "[]"
          );
          setAddresses(savedAddresses);
        }

        // Authoritative live session recovery and database profile sync
        const meRes = await fetch("/api/auth/me");
        if (meRes.status === 401) {
          localStorage.removeItem("vt_user");
          window.dispatchEvent(new Event("vt_auth_changed"));
          if (isMounted) setUser(null);
          return;
        }

        const meData = await meRes.json();
        if (meData?.success && meData?.customer && isMounted) {
          const customer = meData.customer;
          setUser(customer);
          setEditName(customer.name || "");
          setEditPhone(customer.phone || "");
          if (customer.addresses?.length > 0) {
            setAddresses(customer.addresses);
          }
          localStorage.setItem("vt_user", JSON.stringify(customer));
          window.dispatchEvent(new Event("vt_auth_changed"));

          // Fetch live orders directly from MongoDB using authenticated session cookie
          const ordersRes = await fetch("/api/orders");
          if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            if (ordersData?.success && Array.isArray(ordersData.orders) && isMounted) {
              const formatted = ordersData.orders.map((o) => ({
                id: `#${o.orderNumber}`,
                orderNumber: o.orderNumber,
                date: o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Recently",
                status: o.status,
                total: o.pricing?.grandTotal || 0,
                subtotal: o.pricing?.subtotal || 0,
                items: o.items || [],
                shippingAddress: o.shippingAddress,
                fulfillment: o.fulfillment,
                timeline: o.timeline || [],
                payment: o.payment,
              }));
              setOrders(formatted);
              if (customer.email) {
                localStorage.setItem(`vt_orders_${customer.email}`, JSON.stringify(formatted));
              }
            }
          }
        } else if (isMounted && !savedUser) {
          setUser(null);
        }
      } catch (e) {
        console.error("Account data load error:", e);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAccountData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (logoutErr) {
        console.warn("Server logout warning:", logoutErr);
      }
      localStorage.removeItem("vt_user");
      localStorage.removeItem("vt_orders");
      window.dispatchEvent(new Event("vt_auth_changed"));
    } catch {
      // ignore
    }
    toast.info("Signed out of your VogueThreads account");
    router.push("/login");
  };

  const handleOrderCancelled = (cancelledOrder) => {
    const targetId =
      cancelledOrder.orderNumber ||
      (cancelledOrder.id ? cancelledOrder.id.replace("#", "") : "");

    setOrders((prev) =>
      prev.map((o) => {
        const match =
          o.orderNumber === targetId ||
          o.id === targetId ||
          o.id === `#${targetId}` ||
          o.id?.replace("#", "").toLowerCase() === targetId.toLowerCase();
        return match ? { ...o, status: "CANCELLED" } : o;
      })
    );

    if (user?.email) {
      try {
        const cached = JSON.parse(
          localStorage.getItem(`vt_orders_${user.email}`) || "[]"
        );
        const updated = cached.map((o) => {
          const match =
            o.orderNumber === targetId ||
            o.id === targetId ||
            o.id === `#${targetId}` ||
            o.id?.replace("#", "").toLowerCase() === targetId.toLowerCase();
          return match ? { ...o, status: "CANCELLED" } : o;
        });
        localStorage.setItem(`vt_orders_${user.email}`, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: editName.trim(),
          phone: editPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.customer) {
        const updated = { ...user, name: data.customer.name, phone: data.customer.phone };
        setUser(updated);
        localStorage.setItem("vt_user", JSON.stringify(updated));
        window.dispatchEvent(new Event("vt_auth_changed"));
        setIsEditingProfile(false);
        toast.success("Profile updated successfully");
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile changes");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmailInput.trim()) {
      toast.error("Please enter a new email address");
      return;
    }
    setIsRequestingEmailChange(true);
    setEmailChangeSuccessMessage("");
    try {
      const res = await fetch("/api/account/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail: newEmailInput.trim(),
          password: emailChangePassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailChangeSuccessMessage(data.message);
        toast.success("Confirmation link sent to your new email");
        setNewEmailInput("");
        setEmailChangePassword("");
      } else {
        toast.error(data.error || "Failed to initiate email change");
      }
    } catch (err) {
      console.error("Email change request error:", err);
      toast.error("Failed to request email change");
    } finally {
      setIsRequestingEmailChange(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.fullName || !newAddress.addressLine1 || !newAddress.city || !newAddress.pinCode) {
      toast.error("Please fill in all required address fields");
      return;
    }

    const updatedAddresses = [
      ...addresses,
      { ...newAddress, id: `addr-${Date.now()}` },
    ];
    setAddresses(updatedAddresses);
    localStorage.setItem(`vt_addresses_${user.email}`, JSON.stringify(updatedAddresses));

    // Save to database
    try {
      await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          addresses: updatedAddresses,
        }),
      });
    } catch (err) {
      console.warn("Address database sync warning:", err);
    }

    setShowAddAddress(false);
    setNewAddress({
      fullName: "",
      phone: "",
      addressLine1: "",
      city: "",
      state: "",
      pinCode: "",
      type: "SHIPPING",
    });
    toast.success("New delivery address added");
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#E8E4DC]">
        <div className="w-10 h-10 border-3 border-[#141414] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Unauthenticated State (NO static mock user)
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-140px)] py-12 sm:py-20 flex items-center justify-center bg-[#E8E4DC]">
        <Container>
          <div
            className="max-w-md mx-auto p-8 sm:p-10 rounded-[2.25rem] text-center liquid-glass-card shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0.60) 100%)",
              backdropFilter: "blur(28px) saturate(190%)",
              border: "1.5px solid rgba(255, 255, 255, 0.90)",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-black/5 mx-auto flex items-center justify-center text-[#141414] mb-4">
              <User className="w-8 h-8 stroke-[1.5]" />
            </div>
            <h1 className="font-display font-black text-2xl text-[#141414] tracking-tight">
              Customer Account
            </h1>
            <p className="text-xs sm:text-sm text-[#5A5A5E] mt-2 mb-6 leading-relaxed">
              Sign in or create an account to track your orders, view saved wishlist items, and manage addresses.
            </p>
            <div className="space-y-3">
              <Link href="/login?callbackUrl=/account" className="block">
                <Button variant="primary" size="lg" className="w-full rounded-2xl text-xs uppercase tracking-wider font-bold">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup?callbackUrl=/account" className="block">
                <Button variant="outline" size="lg" className="w-full rounded-2xl text-xs uppercase tracking-wider font-bold bg-white/60 hover:bg-white">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // 3. Dynamic User Account Dashboard
  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen py-8 sm:py-12 bg-[#E8E4DC]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Dynamic User Profile Card */}
            <div
              className="p-6 rounded-[2rem] liquid-glass-card shadow-sm flex items-center gap-4"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.40) 100%)",
                backdropFilter: "blur(20px)",
                border: "1.5px solid rgba(255, 255, 255, 0.90)",
              }}
            >
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#141414] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-sm sm:text-base text-[#141414] truncate">
                    {user.name}
                  </h2>
                  {user.provider === "google" && (
                    <span className="w-2 h-2 rounded-full bg-blue-500" title="Google Verified" />
                  )}
                </div>
                <p className="text-xs text-[#5A5A5E] truncate">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 text-[#141414] uppercase tracking-wider">
                  {user.provider === "google" ? "Google Member" : "Verified Member"}
                </span>
              </div>
            </div>

            {/* Navigation List */}
            <div
              className="p-3 rounded-[2rem] liquid-glass-card shadow-sm space-y-1"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.40) 100%)",
                backdropFilter: "blur(20px)",
                border: "1.5px solid rgba(255, 255, 255, 0.90)",
              }}
            >
              {[
                { id: "overview", label: "Overview", icon: User },
                { id: "orders", label: "Orders", icon: Package },
                { id: "wishlist", label: "Wishlist", icon: Heart, href: "/wishlist" },
                { id: "addresses", label: "Addresses", icon: MapPin },
                { id: "profile", label: "Profile Settings", icon: Settings },
              ].map((tab) => {
                const isSelected = activeTab === tab.id;
                const content = (
                  <div className="flex items-center gap-3">
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                );

                if (tab.href) {
                  return (
                    <Link
                      key={tab.id}
                      href={tab.href}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold text-[#5A5A5E] hover:text-[#141414] hover:bg-white/60 transition-all focus-ring"
                    >
                      {content}
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                  );
                }

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all focus-ring cursor-pointer ${
                      isSelected
                        ? "bg-[#141414] text-white shadow-sm"
                        : "text-[#5A5A5E] hover:text-[#141414] hover:bg-white/60"
                    }`}
                  >
                    {content}
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                );
              })}

              <div className="pt-2 border-t border-black/[0.06] mt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all focus-ring cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Right Main Dashboard Area */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-8">
            {/* Overview / Orders Tab */}
            {(activeTab === "overview" || activeTab === "orders") && (
              <div
                className="rounded-[2.25rem] p-6 sm:p-8 liquid-glass-card shadow-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.40) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.90)",
                }}
              >
                <div className="flex items-center justify-between pb-6 border-b border-black/[0.06] mb-6">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-[#141414]">My Orders</h1>
                    <p className="text-xs text-[#5A5A5E] mt-0.5">
                      Live tracking, delivery receipts, and order histories for {user.email}.
                    </p>
                  </div>
                  <Link
                    href="/shop"
                    className="text-xs font-bold text-[#141414] hover:underline flex items-center gap-1 uppercase tracking-wider"
                  >
                    <span>Explore Catalog</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Orders List or Empty State */}
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const statusUpper = (order.status || "CONFIRMED").toUpperCase();
                      const isCancellable = !["SHIPPED", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"].includes(statusUpper);

                      let statusBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      if (statusUpper === "CANCELLED") {
                        statusBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                      } else if (statusUpper === "SHIPPED") {
                        statusBadgeClass = "bg-cyan-50 text-cyan-700 border-cyan-200";
                      } else if (statusUpper === "PROCESSING" || statusUpper === "PACKED") {
                        statusBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                      }

                      return (
                        <div
                          key={order.id || order.orderNumber}
                          className="p-4 sm:p-5 rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm text-[#141414]">{order.id}</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}>
                                ● {order.status || "Confirmed"}
                              </span>
                            </div>
                            <p className="text-xs text-[#8E8E93]">{order.date}</p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2.5">
                            <span className="font-bold text-sm text-[#141414] mr-2">
                              {formatPrice(order.total)}
                            </span>
                            <Link href={`/orders/${order.id.replace("#", "")}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs font-semibold rounded-xl bg-white border-[#E5E2DC] text-[#141414] hover:bg-[#E8E4DC]"
                              >
                                View Details
                              </Button>
                            </Link>
                            {isCancellable && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setOrderToCancel(order)}
                                className="text-xs font-semibold rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 cursor-pointer"
                              >
                                Cancel Order
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-black/[0.04] mx-auto flex items-center justify-center text-[#8E8E93] mb-3">
                      <ShoppingBag className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-[#141414]">No Orders Placed Yet</h3>
                    <p className="text-xs text-[#5A5A5E] max-w-sm mx-auto mt-1 mb-5">
                      Your bag is waiting for its first luxury silhouette. Explore our curated collections.
                    </p>
                    <Link href="/shop">
                      <Button variant="primary" size="sm" className="rounded-xl font-bold uppercase tracking-wider text-xs">
                        Start Shopping
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === "addresses" && (
              <div
                className="rounded-[2.25rem] p-6 sm:p-8 liquid-glass-card shadow-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.40) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.90)",
                }}
              >
                <div className="flex items-center justify-between pb-6 border-b border-black/[0.06] mb-6">
                  <div>
                    <h1 className="font-display text-2xl font-bold text-[#141414]">Saved Addresses</h1>
                    <p className="text-xs text-[#5A5A5E] mt-0.5">
                      Manage delivery destinations for faster checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(!showAddAddress)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#2C2C2E] transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddAddress ? "Cancel" : "Add Address"}</span>
                  </button>
                </div>

                {showAddAddress && (
                  <form onSubmit={handleAddAddress} className="mb-6 p-5 rounded-2xl bg-white/80 border border-white space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#141414]">New Address Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="Recipient Name"
                        value={newAddress.fullName}
                        onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                        className="h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs bg-white focus:outline-none focus:border-[#141414]"
                      />
                      <input
                        type="text"
                        placeholder="Contact Phone"
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs bg-white focus:outline-none focus:border-[#141414]"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Street Address / House / Flat"
                        value={newAddress.addressLine1}
                        onChange={(e) => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                        className="sm:col-span-2 h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs bg-white focus:outline-none focus:border-[#141414]"
                      />
                      <input
                        type="text"
                        required
                        placeholder="City"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs bg-white focus:outline-none focus:border-[#141414]"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Pin Code"
                        value={newAddress.pinCode}
                        onChange={(e) => setNewAddress({ ...newAddress, pinCode: e.target.value })}
                        className="h-10 px-3 rounded-xl border border-[#E5E2DC] text-xs bg-white focus:outline-none focus:border-[#141414]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      Save Address
                    </button>
                  </form>
                )}

                {addresses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((addr, idx) => (
                      <div
                        key={addr.id || idx}
                        className="p-5 rounded-2xl border border-white/90 bg-white/70 backdrop-blur-md space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs uppercase tracking-wider text-[#141414]">
                            {addr.type || "Shipping"}
                          </span>
                          <span className="text-[10px] text-[#8E8E93] font-semibold">Address #{idx + 1}</span>
                        </div>
                        <p className="text-sm font-semibold text-[#141414]">{addr.fullName}</p>
                        <p className="text-xs text-[#5A5A5E]">{addr.addressLine1}</p>
                        <p className="text-xs text-[#5A5A5E]">{addr.city} {addr.pinCode && `- ${addr.pinCode}`}</p>
                        {addr.phone && <p className="text-xs text-[#8E8E93] pt-1">{addr.phone}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#8E8E93]">
                    No addresses saved yet. Click &quot;Add Address&quot; above to add your first destination.
                  </div>
                )}
              </div>
            )}

            {/* Profile Settings Tab */}
            {activeTab === "profile" && (
              <div
                className="rounded-[2.25rem] p-6 sm:p-8 liquid-glass-card shadow-sm"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.40) 100%)",
                  backdropFilter: "blur(20px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.90)",
                }}
              >
                <div className="pb-6 border-b border-black/[0.06] mb-6">
                  <h1 className="font-display text-2xl font-bold text-[#141414]">Profile Settings</h1>
                  <p className="text-xs text-[#5A5A5E] mt-0.5">
                    Update your account details and contact preferences.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#141414]/80">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl text-sm text-[#141414] bg-white border border-[#E5E2DC] focus:outline-none focus:border-[#141414]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#141414]/80">
                        Email Address
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangeEmail(!showChangeEmail);
                          setEmailChangeSuccessMessage("");
                        }}
                        className="text-[11px] font-bold text-[#141414] hover:underline cursor-pointer uppercase tracking-wider"
                      >
                        {showChangeEmail ? "Cancel" : "Change Email"}
                      </button>
                    </div>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full h-11 px-4 rounded-xl text-sm text-[#8E8E93] bg-black/[0.04] border border-black/[0.08] cursor-not-allowed"
                    />
                  </div>

                  {showChangeEmail && (
                    <div className="p-4 rounded-2xl bg-white/90 border border-[#E5E2DC] shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#141414]">
                          Update Primary Email
                        </span>
                        <span className="text-[10px] text-[#8E8E93]">Link expires in 2 hours</span>
                      </div>

                      {emailChangeSuccessMessage ? (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
                          {emailChangeSuccessMessage}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-xs text-[#5A5A5E]">
                            We will dispatch a secure verification link to your new address. Your email will only update once confirmed.
                          </p>
                          <input
                            type="email"
                            required
                            placeholder="Enter new email address"
                            value={newEmailInput}
                            onChange={(e) => setNewEmailInput(e.target.value)}
                            className="w-full h-10 px-3.5 rounded-xl text-xs text-[#141414] bg-white border border-[#E5E2DC] focus:outline-none focus:border-[#141414]"
                          />
                          {user.provider !== "google" && (
                            <input
                              type="password"
                              required
                              placeholder="Confirm current password"
                              value={emailChangePassword}
                              onChange={(e) => setEmailChangePassword(e.target.value)}
                              className="w-full h-10 px-3.5 rounded-xl text-xs text-[#141414] bg-white border border-[#E5E2DC] focus:outline-none focus:border-[#141414]"
                            />
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleRequestEmailChange}
                              disabled={isRequestingEmailChange}
                              className="px-4 py-2 rounded-xl bg-[#141414] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#2C2C2E] transition-all cursor-pointer disabled:opacity-50"
                            >
                              {isRequestingEmailChange ? "Sending Link..." : "Send Confirmation Link"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowChangeEmail(false)}
                              className="px-4 py-2 rounded-xl bg-black/5 text-[#5A5A5E] text-xs font-semibold hover:bg-black/10 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#141414]/80">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl text-sm text-[#141414] bg-white border border-[#E5E2DC] focus:outline-none focus:border-[#141414]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-6 py-3 rounded-xl bg-[#141414] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#2C2C2E] transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? "Saving..." : "Save Profile Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Bottom Stat Cards (Fully Dynamic) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link
                href="/wishlist"
                className="p-5 rounded-3xl bg-white/70 border border-white/90 hover:bg-white shadow-xs transition-all flex flex-col justify-between group"
              >
                <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center text-[#141414] mb-3 group-hover:scale-105 transition-transform">
                  <Heart className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#141414]">Wishlist</h3>
                  <p className="text-xs text-[#5A5A5E] mt-0.5">{wishlistCount} {wishlistCount === 1 ? "item" : "items"}</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setActiveTab("addresses")}
                className="p-5 rounded-3xl bg-white/70 border border-white/90 hover:bg-white shadow-xs transition-all flex flex-col justify-between group text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center text-[#141414] mb-3 group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#141414]">Addresses</h3>
                  <p className="text-xs text-[#5A5A5E] mt-0.5">{addresses.length} saved</p>
                </div>
              </button>

              <div className="p-5 rounded-3xl bg-white/70 border border-white/90 shadow-xs flex flex-col justify-between">
                <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center text-[#141414] mb-3">
                  <Tag className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#141414]">Member Status</h3>
                  <p className="text-xs text-emerald-600 font-bold mt-0.5">Active</p>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white/70 border border-white/90 shadow-xs flex flex-col justify-between">
                <div className="w-10 h-10 rounded-2xl bg-black/5 flex items-center justify-center text-[#141414] mb-3">
                  <Shield className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-[#141414]">Security</h3>
                  <p className="text-xs text-[#5A5A5E] mt-0.5">Verified</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </Container>

      {/* Logout Warning Confirmation Modal */}
      <LogoutWarningModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
      />

      {/* Cancel Order Confirmation Modal */}
      {orderToCancel && (
        <CancelOrderModal
          isOpen={!!orderToCancel}
          onClose={() => setOrderToCancel(null)}
          order={orderToCancel}
          onSuccess={handleOrderCancelled}
        />
      )}
    </div>
  );
}
