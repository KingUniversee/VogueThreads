"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Loader2, Info } from "lucide-react";

export function CouponDialog({ open, onOpenChange, coupon = null, onSuccess }) {
  const isEditing = Boolean(coupon?._id);

  // Form State
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [minimumOrderValue, setMinimumOrderValue] = useState("");
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [perCustomerUsageLimit, setPerCustomerUsageLimit] = useState("1");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [status, setStatus] = useState("ACTIVE");

  // Targeting States
  const [applicableProducts, setApplicableProducts] = useState([]);
  const [applicableCategories, setApplicableCategories] = useState([]);
  const [applicableCollections, setApplicableCollections] = useState([]);
  const [applicableCustomerSegments, setApplicableCustomerSegments] = useState([]);

  // Available options
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [availableSegments, setAvailableSegments] = useState([]);

  const [loadingTargets, setLoadingTargets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Helper to format ISO to date input YYYY-MM-DD
  const toDateInputString = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Fetch available target lists once when dialog opens
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    async function loadTargetOptions() {
      setLoadingTargets(true);
      try {
        const [prodRes, catRes, colRes, segRes] = await Promise.allSettled([
          fetch("/api/products?limit=100").then((r) => r.json()),
          fetch("/api/categories").then((r) => r.json()),
          fetch("/api/collections").then((r) => r.json()),
          fetch("/api/segments").then((r) => r.json()),
        ]);

        if (isMounted) {
          if (prodRes.status === "fulfilled" && prodRes.value.products) {
            setAvailableProducts(prodRes.value.products);
          }
          if (catRes.status === "fulfilled" && catRes.value.categories) {
            setAvailableCategories(catRes.value.categories);
          }
          if (colRes.status === "fulfilled" && colRes.value.collections) {
            setAvailableCollections(colRes.value.collections);
          }
          if (segRes.status === "fulfilled" && segRes.value.segments) {
            setAvailableSegments(segRes.value.segments);
          }
        }
      } catch (err) {
        console.error("Failed to load targets:", err);
      } finally {
        if (isMounted) setLoadingTargets(false);
      }
    }

    loadTargetOptions();
    return () => {
      isMounted = false;
    };
  }, [open]);

  // Populate fields on edit or reset on create
  useEffect(() => {
    if (coupon) {
      setCode(coupon.code || "");
      setDescription(coupon.description || "");
      setDiscountType(coupon.discountType || "PERCENTAGE");
      setDiscountValue(coupon.discountValue != null ? String(coupon.discountValue) : "");
      setMinimumOrderValue(coupon.minimumOrderValue ? String(coupon.minimumOrderValue) : "");
      setMaximumDiscountAmount(coupon.maximumDiscountAmount ? String(coupon.maximumDiscountAmount) : "");
      setUsageLimit(coupon.usageLimit ? String(coupon.usageLimit) : "");
      setPerCustomerUsageLimit(coupon.perCustomerUsageLimit ? String(coupon.perCustomerUsageLimit) : "1");
      setStartAt(toDateInputString(coupon.startAt) || toDateInputString(new Date()));
      setEndAt(toDateInputString(coupon.endAt));
      setFirstOrderOnly(Boolean(coupon.firstOrderOnly));
      setStatus(coupon.status || "ACTIVE");

      setApplicableProducts(
        (coupon.applicableProducts || []).map((p) => (typeof p === "object" ? String(p._id) : String(p)))
      );
      setApplicableCategories(
        (coupon.applicableCategories || []).map((c) => (typeof c === "object" ? String(c._id) : String(c)))
      );
      setApplicableCollections(
        (coupon.applicableCollections || []).map((col) => (typeof col === "object" ? String(col._id) : String(col)))
      );
      setApplicableCustomerSegments(
        (coupon.applicableCustomerSegments || []).map((s) => (typeof s === "object" ? String(s._id) : String(s)))
      );
    } else {
      setCode("");
      setDescription("");
      setDiscountType("PERCENTAGE");
      setDiscountValue("");
      setMinimumOrderValue("");
      setMaximumDiscountAmount("");
      setUsageLimit("");
      setPerCustomerUsageLimit("1");
      setStartAt(toDateInputString(new Date()));
      setEndAt("");
      setFirstOrderOnly(false);
      setStatus("ACTIVE");

      setApplicableProducts([]);
      setApplicableCategories([]);
      setApplicableCollections([]);
      setApplicableCustomerSegments([]);
    }
    setErrors({});
  }, [coupon, open]);

  // Code generator helper
  const handleGenerateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomCode = "VT-";
    for (let i = 0; i < 6; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(randomCode);
  };

  const validate = () => {
    const errs = {};
    if (!code.trim()) errs.code = "Coupon code is required";
    const val = Number(discountValue);
    if (!discountValue || isNaN(val) || val <= 0) {
      errs.discountValue = "Valid discount value greater than 0 is required";
    } else if (discountType === "PERCENTAGE" && val > 100) {
      errs.discountValue = "Percentage discount cannot exceed 100%";
    }

    if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
      errs.endAt = "End date must be after start date";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        code: code.trim().toUpperCase(),
        description: description.trim(),
        discountType,
        discountValue: Number(discountValue),
        minimumOrderValue: minimumOrderValue ? Number(minimumOrderValue) : 0,
        maximumDiscountAmount:
          discountType === "PERCENTAGE" && maximumDiscountAmount ? Number(maximumDiscountAmount) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null,
        perCustomerUsageLimit: perCustomerUsageLimit ? Number(perCustomerUsageLimit) : 1,
        startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        firstOrderOnly,
        status,
        applicableProducts,
        applicableCategories,
        applicableCollections,
        applicableCustomerSegments,
      };

      const url = isEditing ? `/api/coupons/${coupon._id}` : "/api/coupons";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save coupon");
      }

      toast.success(isEditing ? `Coupon '${payload.code}' updated` : `Coupon '${payload.code}' created`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Save coupon error:", err);
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTargetId = (list, setList, id) => {
    const stringId = String(id);
    if (list.includes(stringId)) {
      setList(list.filter((x) => x !== stringId));
    } else {
      setList([...list, stringId]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {isEditing ? `Edit Coupon: ${coupon?.code}` : "Create New Coupon"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure promo code parameters, limits, scheduling, and catalog targeting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-3 mb-5 p-1 bg-slate-100/90 border border-slate-200/80 rounded-lg">
              <TabsTrigger
                value="general"
                className="text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-slate-200/80"
              >
                1. Details & Rules
              </TabsTrigger>
              <TabsTrigger
                value="limits"
                className="text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-slate-200/80"
              >
                2. Limits & Validity
              </TabsTrigger>
              <TabsTrigger
                value="targeting"
                className="text-xs font-medium text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm data-[state=active]:font-semibold data-[state=active]:border data-[state=active]:border-slate-200/80"
              >
                3. Catalog Targeting
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: GENERAL & RULES */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Coupon Code <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. FESTIVE20"
                      className="font-mono uppercase font-bold tracking-wider bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCode}
                      className="gap-1.5 text-xs shrink-0 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Generate
                    </Button>
                  </div>
                  {errors.code && <p className="text-xs text-rose-500 font-medium">{errors.code}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                      <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Flat 20% off on festive ethnic wear collections"
                  rows={2}
                  className="text-xs bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Discount Type <span className="text-rose-500">*</span>
                  </label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger className="bg-white border-slate-200 text-slate-900 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Flat INR (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Discount Value <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "PERCENTAGE" ? "20" : "500"}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                  {errors.discountValue && <p className="text-xs text-rose-500 font-medium">{errors.discountValue}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Min Order Value (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={minimumOrderValue}
                    onChange={(e) => setMinimumOrderValue(e.target.value)}
                    placeholder="0"
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Max Discount Cap (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={maximumDiscountAmount}
                    onChange={(e) => setMaximumDiscountAmount(e.target.value)}
                    placeholder={discountType === "PERCENTAGE" ? "1000" : "N/A"}
                    disabled={discountType === "FIXED"}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  {discountType === "FIXED" && (
                    <p className="text-[10px] text-slate-400">Only for percentage</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: LIMITS & VALIDITY */}
            <TabsContent value="limits" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Total Usage Limit
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Unlimited"
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500">Total redemptions allowed across all customers.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    Per-Customer Limit
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={perCustomerUsageLimit}
                    onChange={(e) => setPerCustomerUsageLimit(e.target.value)}
                    placeholder="1"
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500">How many times each individual customer can redeem.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">Start Date</label>
                  <Input
                    type="date"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800">
                    End Date (Expiration)
                  </label>
                  <Input
                    type="date"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="bg-white border-slate-200 text-slate-900"
                  />
                  {errors.endAt && <p className="text-xs text-rose-500 font-medium">{errors.endAt}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-900">
                    First Order Only
                  </span>
                  <p className="text-[11px] text-slate-600">
                    Restrict redemption exclusively to customers placing their very first order.
                  </p>
                </div>
                <Switch
                  checked={firstOrderOnly}
                  onCheckedChange={setFirstOrderOnly}
                  className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-slate-200"
                />
              </div>
            </TabsContent>

            {/* TAB 3: TARGETING */}
            <TabsContent value="targeting" className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-900 leading-relaxed font-normal">
                  Targeting is optional. If no products, categories, collections, or segments are selected, the coupon applies storewide to all eligible carts.
                </p>
              </div>

              {loadingTargets ? (
                <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-xs text-slate-600">Loading catalog options...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Categories */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">
                        Target Categories
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {applicableCategories.length} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 border border-slate-200 rounded-lg bg-white">
                      {availableCategories.length === 0 ? (
                        <span className="text-xs text-slate-400 italic py-1">No categories found</span>
                      ) : (
                        availableCategories.map((c) => {
                          const isSelected = applicableCategories.includes(String(c._id));
                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => toggleTargetId(applicableCategories, setApplicableCategories, c._id)}
                              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
                              }`}
                            >
                              {c.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Collections */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">
                        Target Collections
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {applicableCollections.length} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 border border-slate-200 rounded-lg bg-white">
                      {availableCollections.length === 0 ? (
                        <span className="text-xs text-slate-400 italic py-1">No collections found</span>
                      ) : (
                        availableCollections.map((col) => {
                          const isSelected = applicableCollections.includes(String(col._id));
                          return (
                            <button
                              key={col._id}
                              type="button"
                              onClick={() => toggleTargetId(applicableCollections, setApplicableCollections, col._id)}
                              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
                              }`}
                            >
                              {col.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Customer Segments */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">
                        Target Customer Segments
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {applicableCustomerSegments.length} selected
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 border border-slate-200 rounded-lg bg-white">
                      {availableSegments.length === 0 ? (
                        <span className="text-xs text-slate-400 italic py-1">No customer segments found</span>
                      ) : (
                        availableSegments.map((seg) => {
                          const isSelected = applicableCustomerSegments.includes(String(seg._id));
                          return (
                            <button
                              key={seg._id}
                              type="button"
                              onClick={() =>
                                toggleTargetId(
                                  applicableCustomerSegments,
                                  setApplicableCustomerSegments,
                                  seg._id
                                )
                              }
                              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300"
                              }`}
                            >
                              {seg.name} ({seg.type})
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 border-t border-slate-200 bg-white gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Update Coupon"
              ) : (
                "Create Coupon"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
