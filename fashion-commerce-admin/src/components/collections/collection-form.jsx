"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  X,
  Package,
  Eye,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProductPickerDialog } from "./product-picker-dialog";

export function CollectionForm({ initialCollection = null, isEditMode = false }) {
  const router = useRouter();

  // Basic Info
  const [name, setName] = useState(initialCollection?.name || "");
  const [slug, setSlug] = useState(initialCollection?.slug || "");
  const [isManualSlug, setIsManualSlug] = useState(Boolean(initialCollection?.slug));
  const [description, setDescription] = useState(initialCollection?.description || "");

  // Media
  const [imageUrl, setImageUrl] = useState(initialCollection?.imageUrl || "");
  const [bannerUrl, setBannerUrl] = useState(initialCollection?.bannerUrl || "");

  // Merchandising Type
  const [type, setType] = useState(initialCollection?.type || "MANUAL");

  // Manual Products: Array of { product: Object|String, position: Number }
  const [selectedProducts, setSelectedProducts] = useState(
    (initialCollection?.products || []).map((p, idx) => ({
      product: p.product?._id ? p.product : p.product,
      position: p.position !== undefined ? p.position : idx + 1,
    }))
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Rule-Based Conditions: Array of { field, operator, value }
  const [rules, setRules] = useState(
    initialCollection?.rules?.length > 0
      ? initialCollection.rules
      : [{ field: "category", operator: "EQUALS", value: "" }]
  );
  const [ruleMatchMode, setRuleMatchMode] = useState(initialCollection?.ruleMatchMode || "ALL");

  // Live Rule Preview State
  const [previewCount, setPreviewCount] = useState(0);
  const [previewSamples, setPreviewSamples] = useState([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Publishing & Scheduling
  const [status, setStatus] = useState(initialCollection?.status || "DRAFT");
  const [isActive, setIsActive] = useState(
    initialCollection?.isActive !== undefined ? initialCollection.isActive : true
  );
  const [isFeatured, setIsFeatured] = useState(Boolean(initialCollection?.isFeatured));
  const [publishAt, setPublishAt] = useState(
    initialCollection?.publishAt ? new Date(initialCollection.publishAt).toISOString().slice(0, 16) : ""
  );
  const [unpublishAt, setUnpublishAt] = useState(
    initialCollection?.unpublishAt ? new Date(initialCollection.unpublishAt).toISOString().slice(0, 16) : ""
  );

  // SEO
  const [metaTitle, setMetaTitle] = useState(initialCollection?.seo?.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(
    initialCollection?.seo?.metaDescription || ""
  );

  // Taxonomies for rule selectors
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Submission / Alerts
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load Categories and Brands for Rule Selectors
  useEffect(() => {
    async function loadTaxonomies() {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/brands"),
        ]);
        if (catRes.ok) {
          const catJson = await catRes.json();
          setCategories(catJson.data || []);
        }
        if (brandRes.ok) {
          const brandJson = await brandRes.json();
          setBrands(brandJson.data || []);
        }
      } catch (err) {
        console.warn("Failed to load taxonomies for collection form:", err);
      }
    }
    loadTaxonomies();
  }, []);

  // Auto-slugify on title change
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!isManualSlug) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  // Preview Rule Matches (Debounced)
  const fetchRulePreview = useCallback(async () => {
    if (type !== "RULE_BASED") return;

    const validRules = rules.filter((r) => r.field && r.value !== "");
    if (validRules.length === 0) {
      setPreviewCount(0);
      setPreviewSamples([]);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const res = await fetch("/api/collections/preview-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: validRules, ruleMatchMode }),
      });
      const json = await res.json();
      if (json.success) {
        setPreviewCount(json.count || 0);
        setPreviewSamples(json.sampleProducts || []);
      }
    } catch (err) {
      console.warn("Rule preview error:", err);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [type, rules, ruleMatchMode]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRulePreview();
    }, 400);
    return () => clearTimeout(handler);
  }, [fetchRulePreview]);

  // Manual Products Reordering
  const moveProduct = (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedProducts.length) return;

    const updated = [...selectedProducts];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    // Re-assign explicit 1-indexed positions
    const reindexed = updated.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));
    setSelectedProducts(reindexed);
  };

  const removeProduct = (index) => {
    const updated = selectedProducts.filter((_, idx) => idx !== index);
    const reindexed = updated.map((item, idx) => ({
      ...item,
      position: idx + 1,
    }));
    setSelectedProducts(reindexed);
  };

  const handleAddProductsFromPicker = (newProducts) => {
    const existingIds = new Set(
      selectedProducts.map((p) => String(p.product?._id || p.product))
    );

    const additions = newProducts
      .filter((np) => !existingIds.has(String(np._id)))
      .map((np, idx) => ({
        product: np,
        position: selectedProducts.length + idx + 1,
      }));

    setSelectedProducts([...selectedProducts, ...additions]);
  };

  // Rule Builders
  const addRule = () => {
    setRules([...rules, { field: "category", operator: "EQUALS", value: "" }]);
  };

  const updateRule = (index, key, val) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [key]: val };

    // Reset value if field changed
    if (key === "field") {
      updated[index].value = "";
      if (val === "price") {
        updated[index].operator = "GREATER_THAN_OR_EQUAL";
      } else {
        updated[index].operator = "EQUALS";
      }
    }
    setRules(updated);
  };

  const removeRule = (index) => {
    if (rules.length === 1) {
      setRules([{ field: "category", operator: "EQUALS", value: "" }]);
      return;
    }
    setRules(rules.filter((_, idx) => idx !== index));
  };

  // Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("Collection Name is required.");
      return;
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) {
      setErrorMessage("A valid URL slug is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        type,
        products:
          type === "MANUAL"
            ? selectedProducts.map((p, idx) => ({
                product: p.product?._id || p.product,
                position: p.position !== undefined ? Number(p.position) : idx + 1,
              }))
            : [],
        rules:
          type === "RULE_BASED"
            ? rules.filter((r) => r.field && r.value !== "")
            : [],
        ruleMatchMode,
        status,
        isActive,
        isFeatured,
        publishAt: publishAt ? new Date(publishAt).toISOString() : null,
        unpublishAt: unpublishAt ? new Date(unpublishAt).toISOString() : null,
        seo: {
          metaTitle: metaTitle.trim(),
          metaDescription: metaDescription.trim(),
        },
      };

      const url = isEditMode
        ? `/api/collections/${initialCollection._id}`
        : "/api/collections";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save collection");
      }

      setSuccessMessage(
        isEditMode
          ? "Collection updated successfully!"
          : "Collection created successfully!"
      );

      setTimeout(() => {
        router.push("/collections");
        router.refresh();
      }, 900);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
              <Link href="/collections" className="flex items-center gap-1 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Collections</span>
              </Link>
            </Button>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              {isEditMode ? `Edit: ${initialCollection?.name}` : "Create Collection"}
            </h1>
            <Badge
              variant={
                status === "PUBLISHED"
                  ? "success"
                  : status === "SCHEDULED"
                  ? "info"
                  : status === "ARCHIVED"
                  ? "danger"
                  : "default"
              }
              className="text-[10px] font-mono uppercase"
            >
              {status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Define merchandising drop parameters, product selection, automated rules, and scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs">
            <Link href="/collections">Cancel</Link>
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Create Collection"
            )}
          </Button>
        </div>
      </div>

      {/* Error & Success Banners */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: BASIC INFORMATION */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900">
              1. Basic Information
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Identify the collection name, customer-facing URL slug, and editorial description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Summer Drop 2026, Oversized Edit"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManualSlug(!isManualSlug)}
                    className="text-[11px] text-indigo-600 hover:underline font-medium"
                  >
                    {isManualSlug ? "Auto-generate" : "Edit manually"}
                  </button>
                </div>
                <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 h-9 text-xs font-mono text-slate-500">
                  <span className="text-[11px] text-slate-400 select-none">/collections/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setIsManualSlug(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="summer-drop-2026"
                    className="bg-transparent text-slate-900 focus:outline-none flex-1 font-semibold ml-0.5 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Editorial Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Curated high-density cotton essentials and breezy silhouettes crafted for summer styling..."
                rows={3}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: MEDIA ASSETS */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900">
              2. Imagery & Campaign Banners
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Provide visual assets for store lookbooks, collection listings, and hero banners.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Thumbnail Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Square Thumbnail Image URL
                </label>
                <div className="flex gap-2 items-start">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or /uploads/..."
                    className="h-9 text-xs"
                  />
                  {imageUrl && (
                    <div className="relative h-9 w-9 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Thumbnail" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute -top-1 -right-1 bg-slate-900 text-white rounded-full p-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Banner / Cover Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hero Banner / Cover Image URL
                </label>
                <div className="flex gap-2 items-start">
                  <Input
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... (16:9 banner)"
                    className="h-9 text-xs"
                  />
                  {bannerUrl && (
                    <div className="relative h-9 w-16 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setBannerUrl("")}
                        className="absolute -top-1 -right-1 bg-slate-900 text-white rounded-full p-0.5"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: MERCHANDISING TYPE SELECTOR */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900">
              3. Merchandising Type
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Choose how products are curated into this collection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Manual Card */}
              <div
                onClick={() => setType("MANUAL")}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  type === "MANUAL"
                    ? "border-slate-900 bg-slate-50/70 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Layers className={`h-4 w-4 ${type === "MANUAL" ? "text-slate-900" : "text-slate-400"}`} />
                  <span className="text-xs font-bold text-slate-900">Manual Collection</span>
                  {type === "MANUAL" && (
                    <Badge variant="default" className="text-[9px] py-0 px-1 ml-auto">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Select specific apparel products one by one and manually assign merchandising display order (Position 1, 2, 3...).
                </p>
              </div>

              {/* Rule-Based Card */}
              <div
                onClick={() => setType("RULE_BASED")}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  type === "RULE_BASED"
                    ? "border-slate-900 bg-slate-50/70 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className={`h-4 w-4 ${type === "RULE_BASED" ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="text-xs font-bold text-slate-900">Rule-Based Collection</span>
                  {type === "RULE_BASED" && (
                    <Badge variant="info" className="text-[9px] py-0 px-1 ml-auto">
                      Automated
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Automatically curate products dynamically based on conditions (e.g. Category = T-Shirts, Price &gt;= ₹1,000, Status = Published).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4A: MANUAL PRODUCT PICKER & ORDERING */}
        {type === "MANUAL" && (
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  4. Curated Products ({selectedProducts.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Manage the exact product lineup and drag or reorder position priorities.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsPickerOpen(true)}
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Products
              </Button>
            </CardHeader>
            <CardContent>
              {selectedProducts.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg text-center">
                  <Package className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-semibold text-slate-700">No products added yet</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                    Click &quot;Add Products&quot; to pick items from your catalog.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPickerOpen(true)}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Browse Catalog
                  </Button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="w-16">Position</span>
                    <span className="flex-1">Product Details</span>
                    <span className="w-24 text-right">Price</span>
                    <span className="w-24 text-right">Reorder</span>
                  </div>

                  {selectedProducts.map((item, index) => {
                    const prod = item.product;
                    const img =
                      prod.primaryImages?.[0]?.url || prod.variants?.[0]?.images?.[0]?.url || "";
                    const price = prod.variants?.[0]?.price ? `₹${prod.variants[0].price}` : "—";

                    return (
                      <div
                        key={prod._id || index}
                        className="flex items-center justify-between p-2.5 hover:bg-slate-50 transition-colors"
                      >
                        {/* Position Badge */}
                        <div className="w-16">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono font-bold text-slate-700">
                            #{item.position}
                          </span>
                        </div>

                        {/* Product Info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={prod.title} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-slate-900 truncate block">
                              {prod.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {prod.variants?.[0]?.sku || "SKU N/A"}
                            </span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="w-24 text-right">
                          <span className="text-xs font-mono font-bold text-slate-800">{price}</span>
                        </div>

                        {/* Reorder Buttons & Remove */}
                        <div className="w-24 flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => moveProduct(index, "up")}
                            disabled={index === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveProduct(index, "down")}
                            disabled={index === selectedProducts.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 disabled:opacity-30"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeProduct(index)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 ml-1"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SECTION 4B: RULE-BASED BUILDER & LIVE PREVIEW */}
        {type === "RULE_BASED" && (
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  4. Automated Collection Rules
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Define dynamic criteria that products must satisfy to be automatically included.
                </CardDescription>
              </div>
              {/* Match Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md text-xs">
                <button
                  type="button"
                  onClick={() => setRuleMatchMode("ALL")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    ruleMatchMode === "ALL"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Match ALL (AND)
                </button>
                <button
                  type="button"
                  onClick={() => setRuleMatchMode("ANY")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    ruleMatchMode === "ANY"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Match ANY (OR)
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rules List */}
              <div className="space-y-2.5">
                {rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex-wrap"
                  >
                    {/* Field Selector */}
                    <select
                      value={rule.field}
                      onChange={(e) => updateRule(idx, "field", e.target.value)}
                      className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="category">Category</option>
                      <option value="brand">Brand</option>
                      <option value="price">Price (₹)</option>
                      <option value="status">Product Status</option>
                      <option value="stock">Stock Availability</option>
                      <option value="tag">Product Tag</option>
                    </select>

                    {/* Operator Selector */}
                    <select
                      value={rule.operator}
                      onChange={(e) => updateRule(idx, "operator", e.target.value)}
                      className="h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:ring-1 focus:ring-slate-900"
                    >
                      {rule.field === "price" ? (
                        <>
                          <option value="GREATER_THAN_OR_EQUAL">&gt;= (Greater or Equal)</option>
                          <option value="LESS_THAN_OR_EQUAL">&lt;= (Less or Equal)</option>
                          <option value="EQUALS">= (Exactly Equal)</option>
                        </>
                      ) : (
                        <>
                          <option value="EQUALS">is equal to</option>
                          <option value="NOT_EQUALS">is not equal to</option>
                        </>
                      )}
                    </select>

                    {/* Value Input (Dynamic based on Field) */}
                    <div className="flex-1 min-w-[160px]">
                      {rule.field === "category" ? (
                        <select
                          value={rule.value}
                          onChange={(e) => updateRule(idx, "value", e.target.value)}
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="">Select Category...</option>
                          {categories.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : rule.field === "brand" ? (
                        <select
                          value={rule.value}
                          onChange={(e) => updateRule(idx, "value", e.target.value)}
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="">Select Brand...</option>
                          {brands.map((b) => (
                            <option key={b._id} value={b._id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      ) : rule.field === "price" ? (
                        <Input
                          type="number"
                          value={rule.value}
                          onChange={(e) => updateRule(idx, "value", e.target.value)}
                          placeholder="e.g. 1999"
                          className="h-8 text-xs font-mono"
                        />
                      ) : rule.field === "status" ? (
                        <select
                          value={rule.value}
                          onChange={(e) => updateRule(idx, "value", e.target.value)}
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="">Select Status...</option>
                          <option value="PUBLISHED">Published</option>
                          <option value="DRAFT">Draft</option>
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                      ) : rule.field === "stock" ? (
                        <select
                          value={rule.value}
                          onChange={(e) => updateRule(idx, "value", e.target.value)}
                          className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:ring-1 focus:ring-slate-900"
                        >
                          <option value="">Select Availability...</option>
                          <option value="IN_STOCK">In Stock</option>
                          <option value="LOW_STOCK">Low Stock</option>
                          <option value="OUT_OF_STOCK">Out of Stock</option>
                        </select>
                      ) : (
                        <Input
                          value={rule.value}
                          onChange={(e) => updateRule(idx, "value", e.target.value)}
                          placeholder="e.g. oversized, summer, linen"
                          className="h-8 text-xs"
                        />
                      )}
                    </div>

                    {/* Delete Rule Button */}
                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Remove condition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRule}
                  className="h-8 text-xs text-slate-700"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  + Add Another Condition
                </Button>
              </div>

              {/* Live Rule Preview Box */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Live Matching Products Preview
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPreviewLoading && (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    )}
                    <Badge variant="default" className="text-[10px] font-mono">
                      {previewCount} products match
                    </Badge>
                  </div>
                </div>

                {previewSamples.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    {previewCount === 0
                      ? "No products in database match the active conditions."
                      : "Matching products will appear here as you configure rules."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {previewSamples.map((p) => (
                      <div
                        key={p._id}
                        className="p-2 bg-white rounded border border-slate-200 flex items-center gap-2 shadow-2xs"
                      >
                        <div className="h-8 w-8 rounded bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] font-semibold text-slate-900 truncate block">
                            {p.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ₹{p.price}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 5: PUBLISHING & SCHEDULING */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900">
              5. Publishing Lifecycle & Scheduling
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Set launch lifecycle, store visibility, and automated publish date/times.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer font-medium"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              {/* Publish At */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Automated Publish At
                </label>
                <Input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => {
                    setPublishAt(e.target.value);
                    if (e.target.value && new Date(e.target.value) > new Date()) {
                      setStatus("SCHEDULED");
                    }
                  }}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Unpublish At */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Automated Unpublish At (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={unpublishAt}
                  onChange={(e) => setUnpublishAt(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Store Visibility (Active)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    When active, collection appears in customer storefront navigation.
                  </span>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Featured Collection
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Pin collection to homepage highlights and hero carousels.
                  </span>
                </div>
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 6: SEARCH ENGINE OPTIMIZATION (SEO) */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-slate-900">
              6. Search Engine Optimization (SEO)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Configure search engine snippets, meta title, and meta description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">Meta Title</label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {metaTitle.length}/60 chars
                  </span>
                </div>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={name ? `${name} | VogueThreads India` : "Luxury Merchandising Drop"}
                  className="h-9 text-xs"
                  maxLength={70}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Meta Description
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {metaDescription.length}/160 chars
                  </span>
                </div>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Shop VogueThreads curated designer drops with fast delivery across India."
                  rows={2}
                  className="text-xs"
                  maxLength={180}
                />
              </div>
            </div>

            {/* Live Google Search Preview */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Google Search Snippet Preview
              </span>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-500 font-mono block truncate">
                  https://voguethreads.in › collections › {slug || "collection-slug"}
                </span>
                <h4 className="text-sm font-medium text-blue-800 hover:underline cursor-pointer truncate">
                  {metaTitle || (name ? `${name} | VogueThreads India` : "Collection Title")}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {metaDescription ||
                    description ||
                    "Explore our exclusive luxury fashion collection at VogueThreads India with timeless tailoring and effortless styling."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs">
            <Link href="/collections">Cancel</Link>
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : isEditMode ? (
              "Save Collection"
            ) : (
              "Create Collection"
            )}
          </Button>
        </div>
      </form>

      {/* Product Picker Modal Dialog */}
      <ProductPickerDialog
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectProducts={handleAddProductsFromPicker}
        alreadySelectedIds={selectedProducts.map((p) => String(p.product?._id || p.product))}
      />
    </div>
  );
}
