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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";

export function DiscountDialog({ open, onOpenChange, discount = null, onSuccess }) {
  const isEditing = Boolean(discount?._id);

  // Form States
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [minimumOrderValue, setMinimumOrderValue] = useState("");
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState("");
  const [priority, setPriority] = useState("10");
  const [stacking, setStacking] = useState("EXCLUSIVE");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
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

  const toDateInputString = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

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

  useEffect(() => {
    if (discount) {
      setName(discount.name || "");
      setDescription(discount.description || "");
      setDiscountType(discount.discountType || "PERCENTAGE");
      setDiscountValue(discount.discountValue != null ? String(discount.discountValue) : "");
      setMinimumOrderValue(discount.minimumOrderValue ? String(discount.minimumOrderValue) : "");
      setMaximumDiscountAmount(
        discount.maximumDiscountAmount ? String(discount.maximumDiscountAmount) : ""
      );
      setPriority(discount.priority != null ? String(discount.priority) : "10");
      setStacking(discount.stacking || "EXCLUSIVE");
      setStartAt(toDateInputString(discount.startAt) || toDateInputString(new Date()));
      setEndAt(toDateInputString(discount.endAt));
      setStatus(discount.status || "ACTIVE");

      setApplicableProducts(
        (discount.applicableProducts || []).map((p) => (typeof p === "object" ? String(p._id) : String(p)))
      );
      setApplicableCategories(
        (discount.applicableCategories || []).map((c) => (typeof c === "object" ? String(c._id) : String(c)))
      );
      setApplicableCollections(
        (discount.applicableCollections || []).map((col) => (typeof col === "object" ? String(col._id) : String(col)))
      );
      setApplicableCustomerSegments(
        (discount.applicableCustomerSegments || []).map((s) => (typeof s === "object" ? String(s._id) : String(s)))
      );
    } else {
      setName("");
      setDescription("");
      setDiscountType("PERCENTAGE");
      setDiscountValue("");
      setMinimumOrderValue("");
      setMaximumDiscountAmount("");
      setPriority("10");
      setStacking("EXCLUSIVE");
      setStartAt(toDateInputString(new Date()));
      setEndAt("");
      setStatus("ACTIVE");

      setApplicableProducts([]);
      setApplicableCategories([]);
      setApplicableCollections([]);
      setApplicableCustomerSegments([]);
    }
    setErrors({});
  }, [discount, open]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = "Promotion name is required";
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
        name: name.trim(),
        description: description.trim(),
        discountType,
        discountValue: Number(discountValue),
        minimumOrderValue: minimumOrderValue ? Number(minimumOrderValue) : 0,
        maximumDiscountAmount:
          discountType === "PERCENTAGE" && maximumDiscountAmount ? Number(maximumDiscountAmount) : null,
        priority: parseInt(priority, 10) || 10,
        stacking,
        startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        status,
        applicableProducts,
        applicableCategories,
        applicableCollections,
        applicableCustomerSegments,
      };

      const url = isEditing ? `/api/discounts/${discount._id}` : "/api/discounts";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save discount promotion");
      }

      toast.success(isEditing ? `Promotion '${payload.name}' updated` : `Promotion '${payload.name}' created`);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Save discount error:", err);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEditing ? `Edit Promotion: ${discount?.name}` : "Create Automatic Store Promotion"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure automated cart discounts, priority resolution order, and catalog targeting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="general">1. Details & Rules</TabsTrigger>
              <TabsTrigger value="priority">2. Priority & Scheduling</TabsTrigger>
              <TabsTrigger value="targeting">3. Catalog Targeting</TabsTrigger>
            </TabsList>

            {/* TAB 1: DETAILS */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Promotion Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Diwali Festive Flash Sale 15%"
                    className="font-medium"
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
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
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Automatically deducted at checkout for orders above ₹1,999"
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Discount Type <span className="text-red-500">*</span>
                  </label>
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Flat INR (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Discount Value <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "PERCENTAGE" ? "15" : "300"}
                  />
                  {errors.discountValue && <p className="text-xs text-red-500">{errors.discountValue}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Min Order Value (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={minimumOrderValue}
                    onChange={(e) => setMinimumOrderValue(e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Max Discount Cap (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={maximumDiscountAmount}
                    onChange={(e) => setMaximumDiscountAmount(e.target.value)}
                    placeholder={discountType === "PERCENTAGE" ? "1500" : "N/A"}
                    disabled={discountType === "FIXED"}
                  />
                  {discountType === "FIXED" && (
                    <p className="text-[10px] text-slate-400">Only for percentage</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: PRIORITY & SCHEDULING */}
            <TabsContent value="priority" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Priority Rank (1 = Highest)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    placeholder="10"
                  />
                  <p className="text-[11px] text-slate-400">
                    Determines evaluation order when multiple promotions apply.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Stacking / Exclusivity
                  </label>
                  <Select value={stacking} onValueChange={setStacking}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXCLUSIVE">EXCLUSIVE (Cannot combine)</SelectItem>
                      <SelectItem value="STACKABLE">STACKABLE (Can combine with others)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-400">
                    Exclusive promotions stop further promotion evaluation.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
                  <Input
                    type="date"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    End Date (Expiration)
                  </label>
                  <Input
                    type="date"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />
                  {errors.endAt && <p className="text-xs text-red-500">{errors.endAt}</p>}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: TARGETING */}
            <TabsContent value="targeting" className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Targeting is optional. If no products, categories, collections, or segments are selected, the promotion applies automatically storewide to all eligible carts.
                </p>
              </div>

              {loadingTargets ? (
                <div className="flex items-center justify-center p-8 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Loading catalog options...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Categories */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Target Categories ({applicableCategories.length} selected)
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-md">
                      {availableCategories.length === 0 ? (
                        <span className="text-xs text-slate-400">No categories found</span>
                      ) : (
                        availableCategories.map((c) => {
                          const isSelected = applicableCategories.includes(String(c._id));
                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => toggleTargetId(applicableCategories, setApplicableCategories, c._id)}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
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
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Target Collections ({applicableCollections.length} selected)
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-md">
                      {availableCollections.length === 0 ? (
                        <span className="text-xs text-slate-400">No collections found</span>
                      ) : (
                        availableCollections.map((col) => {
                          const isSelected = applicableCollections.includes(String(col._id));
                          return (
                            <button
                              key={col._id}
                              type="button"
                              onClick={() => toggleTargetId(applicableCollections, setApplicableCollections, col._id)}
                              className={`text-xs px-2 py-1 rounded border transition-colors ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
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
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Target Customer Segments ({applicableCustomerSegments.length} selected)
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-md">
                      {availableSegments.length === 0 ? (
                        <span className="text-xs text-slate-400">No customer segments found</span>
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
                              className={`text-xs px-2 py-1 rounded border transition-colors ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
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

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Update Promotion"
              ) : (
                "Create Promotion"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
