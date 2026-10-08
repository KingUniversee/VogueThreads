"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Settings,
  Store,
  Receipt,
  Truck,
  CreditCard,
  Save,
  CheckCircle2,
  RefreshCw,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

const SYSTEM_NAV = [
  { href: "/admin-users", label: "Admin Users" },
  { href: "/roles", label: "Roles & Permissions" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/settings", label: "Settings", active: true },
  { href: "/security", label: "Security" },
];

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    store: {},
    tax: {},
    shipping: {},
    payments: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load settings");
      }
      setSettings(json.settings);
      setFormData({
        store: { ...json.settings.store },
        tax: { ...json.settings.tax },
        shipping: { ...json.settings.shipping },
        payments: { ...json.settings.payments },
      });
    } catch (err) {
      console.error("Settings load error:", err);
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save settings");
      }
      setSettings(json.settings);
      setStatusMessage({ type: "success", text: "Settings saved and synchronized successfully!" });
      setTimeout(() => setStatusMessage({ type: "", text: "" }), 4000);
    } catch (err) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: "General Store", icon: Store },
    { id: "tax", label: "Indian GST & Tax", icon: Receipt },
    { id: "shipping", label: "Logistics & Shipping", icon: Truck },
    { id: "payments", label: "Payments & COD", icon: CreditCard },
  ];

  return (
    <div className="space-y-6 antialiased">
      <PageHeader
        title="Store & System Settings"
        description="Centralized configuration for legal entities, Indian GST compliance, logistics couriers, and payment methods."
      />

      {/* Sub-nav */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        {SYSTEM_NAV.map((nav) => (
          <Link
            key={nav.href}
            href={nav.href}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              nav.active
                ? "bg-slate-900 text-white font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {nav.label}
          </Link>
        ))}
      </div>

      {statusMessage.text && (
        <div
          className={`p-4 rounded-lg text-xs flex items-center gap-2 border ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-red-600 flex-shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-56 flex-shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/70"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Settings Panels */}
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            {/* GENERAL TAB */}
            {activeTab === "general" && (
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Store className="h-4 w-4 text-slate-600" />
                    Store Identity & Regional Format
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Store Name</label>
                      <input
                        type="text"
                        value={formData.store?.name || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, store: { ...formData.store, name: e.target.value } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Legal Registered Entity</label>
                      <input
                        type="text"
                        value={formData.store?.legalEntity || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, store: { ...formData.store, legalEntity: e.target.value } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Support Email</label>
                      <input
                        type="email"
                        value={formData.store?.email || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, store: { ...formData.store, email: e.target.value } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Customer Care Phone</label>
                      <input
                        type="text"
                        value={formData.store?.phone || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, store: { ...formData.store, phone: e.target.value } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Primary Currency</label>
                      <input
                        type="text"
                        disabled
                        value="INR (Indian Rupee - ₹)"
                        className="w-full h-8 px-2.5 bg-slate-100 border border-slate-200 rounded text-slate-500 cursor-not-allowed font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Default Business Timezone</label>
                      <input
                        type="text"
                        disabled
                        value="Asia/Kolkata (IST, UTC+5:30)"
                        className="w-full h-8 px-2.5 bg-slate-100 border border-slate-200 rounded text-slate-500 cursor-not-allowed font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAX & GST TAB */}
            {activeTab === "tax" && (
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-slate-600" />
                    Indian Goods and Services Tax (GST)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">GSTIN Number (15 Digits)</label>
                      <input
                        type="text"
                        maxLength={15}
                        value={formData.tax?.gstin || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, tax: { ...formData.tax, gstin: e.target.value.toUpperCase() } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Registered State</label>
                      <input
                        type="text"
                        value={formData.tax?.registeredState || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, tax: { ...formData.tax, registeredState: e.target.value } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">State Code</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={formData.tax?.registeredStateCode || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, tax: { ...formData.tax, registeredStateCode: e.target.value } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Default Apparel HSN Code</label>
                      <input
                        type="text"
                        value={formData.tax?.defaultHsnCode || "6109"}
                        onChange={(e) =>
                          setFormData({ ...formData, tax: { ...formData.tax, defaultHsnCode: e.target.value } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Default GST Slab (%)</label>
                      <select
                        value={formData.tax?.defaultGstRate || 5}
                        onChange={(e) =>
                          setFormData({ ...formData, tax: { ...formData.tax, defaultGstRate: Number(e.target.value) } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                      >
                        <option value={0}>0% (Exempt)</option>
                        <option value={5}>5% (Apparel ≤ ₹1,000)</option>
                        <option value={12}>12% (Apparel &gt; ₹1,000)</option>
                        <option value={18}>18% (Standard / Accessories)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tax?.pricesIncludeTax ?? true}
                        onChange={(e) =>
                          setFormData({ ...formData, tax: { ...formData.tax, pricesIncludeTax: e.target.checked } })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900"
                      />
                      <span className="font-medium text-slate-800">
                        Catalog prices already include Indian GST (MRP Inclusive Pricing)
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SHIPPING TAB */}
            {activeTab === "shipping" && (
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-slate-600" />
                    Courier Integrations & Delivery Rates
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Default Logistics Partner</label>
                      <select
                        value={formData.shipping?.defaultCourier || "DELHIVERY"}
                        onChange={(e) =>
                          setFormData({ ...formData, shipping: { ...formData.shipping, defaultCourier: e.target.value } })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                      >
                        <option value="DELHIVERY">Delhivery Surface / Express</option>
                        <option value="SHIPROCKET">Shiprocket Multi-Courier</option>
                        <option value="BLUEDART">BlueDart Express</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Default Garment Weight (Grams)</label>
                      <input
                        type="number"
                        min={50}
                        value={formData.shipping?.defaultWeightGrams || 350}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shipping: { ...formData.shipping, defaultWeightGrams: Number(e.target.value) },
                          })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Free Shipping Minimum Cart (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.shipping?.freeShippingThreshold || 999}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shipping: { ...formData.shipping, freeShippingThreshold: Number(e.target.value) },
                          })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Standard Domestic Shipping Fee (₹)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.shipping?.standardShippingFee || 49}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            shipping: { ...formData.shipping, standardShippingFee: Number(e.target.value) },
                          })
                        }
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-slate-900 font-mono"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PAYMENTS TAB */}
            {activeTab === "payments" && (
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-slate-600" />
                    Payment Gateways & Cash on Delivery (COD)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
                      <input
                        type="checkbox"
                        checked={formData.payments?.codEnabled ?? true}
                        onChange={(e) =>
                          setFormData({ ...formData, payments: { ...formData.payments, codEnabled: e.target.checked } })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-900"
                      />
                      <span>Enable Cash on Delivery (COD)</span>
                    </label>

                    {formData.payments?.codEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 pl-6">
                        <div>
                          <label className="font-medium text-slate-700 block mb-1">COD Convenience Fee (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={formData.payments?.codFee || 30}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                payments: { ...formData.payments, codFee: Number(e.target.value) },
                              })
                            }
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-slate-700 block mb-1">Max Order Value for COD (₹)</label>
                          <input
                            type="number"
                            min={500}
                            value={formData.payments?.codMaxOrderValue || 5000}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                payments: { ...formData.payments, codMaxOrderValue: Number(e.target.value) },
                              })
                            }
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="font-semibold text-slate-900 block">Online Payment Gateways</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <span className="font-medium text-slate-800">Razorpay (UPI, Cards, NetBanking)</span>
                        <input
                          type="checkbox"
                          checked={formData.payments?.razorpayEnabled ?? true}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              payments: { ...formData.payments, razorpayEnabled: e.target.checked },
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                        <span className="font-medium text-slate-800">PhonePe Payment Gateway</span>
                        <input
                          type="checkbox"
                          checked={formData.payments?.phonepeEnabled ?? false}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              payments: { ...formData.payments, phonepeEnabled: e.target.checked },
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-slate-900"
                        />
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bottom Actions */}
            <div className="mt-4 flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500">
                Changes are logged to the immutable audit ledger with before & after state diffs.
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchSettings}
                  disabled={isSaving || isLoading}
                  className="h-8 px-3 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                  Reset
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving || isLoading}
                  className="h-8 px-4 text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
