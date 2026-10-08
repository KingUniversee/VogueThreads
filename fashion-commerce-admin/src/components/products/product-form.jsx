"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  IndianRupee,
  ShieldCheck,
  Globe,
  Calendar,
  AlertCircle,
  Clock,
  Eye,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { VariantMatrix } from "@/components/products/variant-matrix";
import { formatINR } from "@/lib/formatters";

export const FASHION_FABRIC_OPTIONS = [
  "100% Combed Cotton",
  "French Terry Cotton",
  "Linen Blend",
  "Raw Selvedge Denim",
  "Modal & Spandex Blend",
  "Silk Crepe",
  "Poly-Viscose",
  "Merino Wool",
  "Ribbed Cotton",
];

export const FASHION_FIT_OPTIONS = [
  "Regular Fit",
  "Slim Fit",
  "Oversized / Boxy",
  "Relaxed Fit",
  "Tailored Fit",
  "Athletic Fit",
];

export const FASHION_PATTERN_OPTIONS = [
  "Solid Plain",
  "Striped",
  "Graphic Screen Print",
  "Plaid / Checkered",
  "Houndstooth",
  "Colorblocked",
  "Embroidered",
  "Tie & Dye",
];

export const FASHION_SLEEVE_OPTIONS = [
  "Half Sleeve",
  "Full Sleeve",
  "Sleeveless",
  "3/4th Sleeve",
  "Drop Shoulder",
  "Raglan Sleeve",
];

export const FASHION_NECK_OPTIONS = [
  "Crew Neck / Round Neck",
  "Polo Collar",
  "Mandarin / Nehru Collar",
  "Spread Collar",
  "V-Neck",
  "Hooded",
  "Henley",
];

export const FASHION_OCCASION_OPTIONS = [
  "Casual Wear",
  "Streetwear",
  "Formal / Workwear",
  "Festive / Ethnic",
  "Party / Evening",
  "Loungewear",
  "Gym & Activewear",
];

export const FASHION_SEASON_OPTIONS = [
  "All Season",
  "Spring / Summer (SS26)",
  "Autumn / Winter (AW26)",
  "Monsoon Capsule",
];

export function ProductForm({ initialProduct = null, isEditMode = false }) {
  const router = useRouter();

  // 1. Basic Info
  const [title, setTitle] = useState(initialProduct?.title || "");
  const [slug, setSlug] = useState(initialProduct?.slug || "");
  const [isManualSlug, setIsManualSlug] = useState(Boolean(initialProduct?.slug));
  const [shortDescription, setShortDescription] = useState(initialProduct?.shortDescription || "");
  const [description, setDescription] = useState(initialProduct?.description || "");
  const [categoryId, setCategoryId] = useState(
    initialProduct?.categoryId?._id || initialProduct?.categoryId || ""
  );
  const [brandId, setBrandId] = useState(
    initialProduct?.brandId?._id || initialProduct?.brandId || ""
  );
  const [selectedCollectionIds, setSelectedCollectionIds] = useState(
    (initialProduct?.collectionIds || []).map((c) => (c._id ? c._id : c))
  );
  const [gender, setGender] = useState(initialProduct?.gender || "UNISEX");
  const [hsnCode, setHsnCode] = useState(initialProduct?.hsnCode || "6109");
  const [gstRate, setGstRate] = useState(initialProduct?.gstRate || 5);

  // 2. Media
  const [images, setImages] = useState(
    initialProduct?.primaryImages || []
  );
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // 3. Pricing
  const [basePrice, setBasePrice] = useState(
    initialProduct?.variants?.[0]?.price !== undefined ? initialProduct.variants[0].price : ""
  );
  const [compareAtPrice, setCompareAtPrice] = useState(
    initialProduct?.variants?.[0]?.compareAtPrice !== undefined
      ? initialProduct.variants[0].compareAtPrice
      : ""
  );
  const [costPrice, setCostPrice] = useState(
    initialProduct?.variants?.[0]?.costPrice !== undefined ? initialProduct.variants[0].costPrice : ""
  );

  // 4. Clothing Variants
  const [variants, setVariants] = useState(initialProduct?.variants || []);
  const handleVariantsChange = useCallback((updatedVariants) => {
    setVariants(updatedVariants);
  }, []);

  // 5. Fashion Attributes
  const [fabric, setFabric] = useState("");
  const [fit, setFit] = useState("");
  const [pattern, setPattern] = useState("");
  const [sleeve, setSleeve] = useState("");
  const [neck, setNeck] = useState("");
  const [occasion, setOccasion] = useState("");
  const [season, setSeason] = useState("All Season");
  const [careInstructions, setCareInstructions] = useState(
    initialProduct?.careInstructions?.join(", ") || "Machine wash cold with like colors. Tumble dry low."
  );

  // 6. SEO
  const [metaTitle, setMetaTitle] = useState(initialProduct?.metadata?.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(initialProduct?.metadata?.metaDescription || "");

  // 7. Publishing Lifecycle (DRAFT, SCHEDULED, PUBLISHED, ARCHIVED only - NO ACTIVE)
  const [status, setStatus] = useState(
    initialProduct?.status && ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(initialProduct.status)
      ? initialProduct.status
      : "DRAFT"
  );
  const [publishAt, setPublishAt] = useState(
    initialProduct?.publishAt ? new Date(initialProduct.publishAt).toISOString().slice(0, 16) : ""
  );

  // Categories, Brands, Collections, Attributes registry state
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableBrands, setAvailableBrands] = useState([]);
  const [availableCollections, setAvailableCollections] = useState([]);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [customAttributeValues, setCustomAttributeValues] = useState({});

  // Inline Quick Add state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [showAddBrand, setShowAddBrand] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load existing fashion attributes if present in initialProduct
  useEffect(() => {
    if (initialProduct?.attributes?.length) {
      const initialCustom = {};
      initialProduct.attributes.forEach((attr) => {
        if (attr.name) initialCustom[attr.name] = attr.value;
        if (attr.name === "Fabric") setFabric(attr.value);
        if (attr.name === "Fit") setFit(attr.value);
        if (attr.name === "Pattern") setPattern(attr.value);
        if (attr.name === "Sleeve") setSleeve(attr.value);
        if (attr.name === "Neck") setNeck(attr.value);
        if (attr.name === "Occasion") setOccasion(attr.value);
        if (attr.name === "Season") setSeason(attr.value);
      });
      setCustomAttributeValues(initialCustom);
    }
  }, [initialProduct]);

  // Fetch real categories, brands, collections, attributes from database
  useEffect(() => {
    async function loadTaxonomies() {
      try {
        const [catRes, brandRes, colRes, attrRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/brands"),
          fetch("/api/collections"),
          fetch("/api/attributes"),
        ]);
        if (catRes.ok) {
          const json = await catRes.json();
          setAvailableCategories(json.data || []);
        }
        if (brandRes.ok) {
          const json = await brandRes.json();
          setAvailableBrands(json.data || []);
        }
        if (colRes.ok) {
          const json = await colRes.json();
          setAvailableCollections(json.data || []);
        }
        if (attrRes.ok) {
          const json = await attrRes.json();
          setAvailableAttributes(json.data || []);
        }
      } catch (err) {
        console.warn("Failed to load catalog dropdown taxonomies:", err);
      }
    }
    loadTaxonomies();
  }, []);

  // Auto-slugify on title change (unless manual edit)
  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (!isManualSlug) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  };

  // Add Image via URL
  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;
    const newImg = {
      url: newImageUrl.trim(),
      key: `img_${Date.now()}`,
      alt: newImageAlt.trim() || title || "Apparel style",
      sortOrder: images.length,
    };
    setImages([...images, newImg]);
    setNewImageUrl("");
    setNewImageAlt("");
  };

  // File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "File upload failed");
      }

      setImages([
        ...images,
        {
          url: json.data.url,
          key: json.data.key,
          alt: file.name,
          sortOrder: images.length,
        },
      ]);
    } catch (err) {
      setErrorMessage(err.message || "Failed to upload image file");
    } finally {
      setIsUploading(false);
    }
  };

  // Quick Add Category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to create category");

      setAvailableCategories([...availableCategories, json.data]);
      setCategoryId(json.data._id);
      setNewCategoryName("");
      setShowAddCategory(false);
    } catch (err) {
      setErrorMessage(err.message || "Failed to create category");
    }
  };

  // Quick Add Brand
  const handleCreateBrand = async (e) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBrandName.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to create brand");

      setAvailableBrands([...availableBrands, json.data]);
      setBrandId(json.data._id);
      setNewBrandName("");
      setShowAddBrand(false);
    } catch (err) {
      setErrorMessage(err.message || "Failed to create brand");
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    // Client-side validations
    if (!title.trim()) {
      setErrorMessage("Please specify a Product Title.");
      setIsSubmitting(false);
      return;
    }
    if (!categoryId) {
      setErrorMessage("Please select or add a Product Category.");
      setIsSubmitting(false);
      return;
    }
    if (!variants || variants.length === 0) {
      setErrorMessage("Please enable at least one Color × Size variant combination in the matrix.");
      setIsSubmitting(false);
      return;
    }

    // Compile fashion attributes array
    const compiledAttributes = [];
    if (availableAttributes.length > 0) {
      availableAttributes.forEach((attr) => {
        const val = customAttributeValues[attr.name];
        if (val !== undefined && val !== "") {
          compiledAttributes.push({
            name: attr.name,
            value: Array.isArray(val) ? val.join(", ") : String(val),
          });
        }
      });
    } else {
      if (fabric) compiledAttributes.push({ name: "Fabric", value: fabric });
      if (fit) compiledAttributes.push({ name: "Fit", value: fit });
      if (pattern) compiledAttributes.push({ name: "Pattern", value: pattern });
      if (sleeve) compiledAttributes.push({ name: "Sleeve", value: sleeve });
      if (neck) compiledAttributes.push({ name: "Neck", value: neck });
      if (occasion) compiledAttributes.push({ name: "Occasion", value: occasion });
      if (season) compiledAttributes.push({ name: "Season", value: season });
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      categoryId,
      brandId: brandId || null,
      collectionIds: selectedCollectionIds,
      gender,
      hsnCode: hsnCode.trim(),
      gstRate: Number(gstRate),
      status,
      publishAt: status === "SCHEDULED" && publishAt ? new Date(publishAt) : null,
      primaryImages: images,
      variants,
      attributes: compiledAttributes,
      careInstructions: careInstructions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      metadata: {
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
      },
    };

    try {
      const endpoint = isEditMode ? `/api/products/${initialProduct._id}` : "/api/products";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save product document");
      }

      setSuccessMessage(isEditMode ? "Product updated successfully!" : "Product created successfully!");
      setTimeout(() => {
        router.push(`/products/${json.data._id || initialProduct._id}`);
      }, 700);
    } catch (err) {
      console.error("Save product error:", err);
      setErrorMessage(err.message || "An unexpected error occurred while saving the product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Margin calculation
  const numBase = Number(basePrice) || 0;
  const numCost = Number(costPrice) || 0;
  const profitMargin =
    numBase > 0 && numCost > 0 ? (((numBase - numCost) / numBase) * 100).toFixed(1) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 antialiased pb-16 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* HEADER WITH CONTEXT, BREADCRUMB & SAVE ACTIONS                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-lg border border-slate-200 shadow-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-slate-500">
              <Link href="/products" className="flex items-center gap-1 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Catalog</span>
              </Link>
            </Button>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              {isEditMode ? `Edit: ${initialProduct?.title || "Apparel Style"}` : "Create Apparel Product"}
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
            Define apparel specifications, Color × Size variant matrix, Indian GST taxonomy, and imagery.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs">
            <Link href="/products">Cancel</Link>
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-9 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5"
          >
            <Save className={`h-3.5 w-3.5 ${isSubmitting ? "animate-spin" : ""}`} />
            <span>{isSubmitting ? "Saving..." : isEditMode ? "Save Changes" : "Save & Publish"}</span>
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================================================= */}
        {/* LEFT 2 COLUMNS: PRIMARY SECTIONS (Basic, Media, Variants, Attributes)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: BASIC INFORMATION */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>1. Basic Information</CardTitle>
              <CardDescription>Primary identification, styling name, and descriptions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="e.g. Heavyweight Relaxed Crewneck Tee"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">URL Slug</label>
                  <button
                    type="button"
                    onClick={() => setIsManualSlug(!isManualSlug)}
                    className="text-[11px] text-indigo-600 hover:underline font-medium"
                  >
                    {isManualSlug ? "Auto-generate from Title" : "Edit manually"}
                  </button>
                </div>
                <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-3 h-9 text-xs font-mono text-slate-500">
                  <span>voguethreads.in/products/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setIsManualSlug(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="heavyweight-relaxed-tee"
                    className="bg-transparent text-slate-900 focus:outline-none flex-1 font-semibold ml-0.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender / Product Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gender / Division
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="UNISEX">Unisex</option>
                    <option value="MEN">Men</option>
                    <option value="WOMEN">Women</option>
                    <option value="KIDS">Kids</option>
                  </select>
                </div>

                {/* HSN & GST Tax Code */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                    <Input
                      value={hsnCode}
                      onChange={(e) => setHsnCode(e.target.value)}
                      placeholder="6109"
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate</label>
                    <select
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="w-full h-9 px-2 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:ring-1 focus:ring-slate-900 focus:outline-none cursor-pointer font-mono"
                    >
                      <option value={5}>5% (Standard Apparel &lt; ₹1,000)</option>
                      <option value={12}>12% (Apparel &gt; ₹1,000)</option>
                      <option value={18}>18% (Luxury / Accessories)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Short Editorial Summary
                </label>
                <Input
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="240 GSM French terry cotton with structured shoulders."
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complete Product Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of the apparel style, silhouette, drape, and material composition..."
                  rows={4}
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: PRODUCT MEDIA GALLERY */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>2. Product Media Gallery</CardTitle>
                  <CardDescription>Upload campaign lookbooks and variant colorway images.</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {images.length} uploaded
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={img.key || idx}
                    className="relative rounded-lg border border-slate-200 overflow-hidden group aspect-[3/4] bg-slate-100 flex items-center justify-center shadow-subtle"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.alt || "Product"} className="h-full w-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-900 text-white shadow">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
                      title="Remove image"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Upload Action Box */}
                <label className="border-2 border-dashed border-slate-200 rounded-lg aspect-[3/4] flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-slate-50 transition-colors group">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 mb-2">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700">
                    {isUploading ? "Uploading..." : "Upload File"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WEBP</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Add by Image URL */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-600 mb-2">Or Add via Image URL:</p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://images.unsplash.com/... or fashion CDN URL"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  <Input
                    placeholder="Alt text"
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddImageUrl}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add URL
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: CLOTHING VARIANT MATRIX (Core Apparel Engine) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>3. Clothing Variants Engine</CardTitle>
                  <CardDescription>
                    Dynamically generate Color × Size combinations, manage SKUs, and track availability.
                  </CardDescription>
                </div>
                <Badge variant="info" className="font-mono text-xs">
                  {variants.length} active variants
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <VariantMatrix
                productTitle={title}
                basePrice={basePrice}
                compareAtPrice={compareAtPrice}
                costPrice={costPrice}
                variants={variants}
                onChange={handleVariantsChange}
              />
            </CardContent>
          </Card>

          {/* SECTION 4: FASHION ATTRIBUTES */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>4. Fashion Attributes & Specifications</CardTitle>
              <CardDescription>
                Apparel taxonomy used for storefront filtering, sizing guides, and technical specifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableAttributes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {availableAttributes.map((attr) => {
                    const val = customAttributeValues[attr.name] || "";
                    if (attr.type === "SELECT" || attr.type === "COLOR") {
                      return (
                        <div key={attr._id}>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {attr.name} {attr.isRequired && <span className="text-rose-500">*</span>}
                          </label>
                          <select
                            value={val}
                            onChange={(e) =>
                              setCustomAttributeValues({
                                ...customAttributeValues,
                                [attr.name]: e.target.value,
                              })
                            }
                            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                          >
                            <option value="">Select {attr.name}...</option>
                            {attr.options?.filter((o) => o.isActive !== false).map((opt) => (
                              <option key={opt.value} value={opt.label}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    } else if (attr.type === "MULTISELECT") {
                      return (
                        <div key={attr._id}>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {attr.name} {attr.isRequired && <span className="text-rose-500">*</span>}
                          </label>
                          <Input
                            value={val}
                            onChange={(e) =>
                              setCustomAttributeValues({
                                ...customAttributeValues,
                                [attr.name]: e.target.value,
                              })
                            }
                            placeholder={attr.options?.map((o) => o.label).slice(0, 3).join(", ") || "e.g. Casual, Party"}
                            className="h-9 text-xs"
                          />
                        </div>
                      );
                    } else if (attr.type === "BOOLEAN") {
                      return (
                        <div key={attr._id}>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {attr.name}
                          </label>
                          <select
                            value={val}
                            onChange={(e) =>
                              setCustomAttributeValues({
                                ...customAttributeValues,
                                [attr.name]: e.target.value,
                              })
                            }
                            className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                          >
                            <option value="">Unspecified</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      );
                    } else {
                      return (
                        <div key={attr._id}>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {attr.name} {attr.isRequired && <span className="text-rose-500">*</span>}
                          </label>
                          <Input
                            type={attr.type === "NUMBER" ? "number" : "text"}
                            value={val}
                            onChange={(e) =>
                              setCustomAttributeValues({
                                ...customAttributeValues,
                                [attr.name]: e.target.value,
                              })
                            }
                            placeholder={`Enter ${attr.name.toLowerCase()}...`}
                            className="h-9 text-xs"
                          />
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Fabric */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fabric</label>
                      <input
                        list="fabric-options"
                        value={fabric}
                        onChange={(e) => setFabric(e.target.value)}
                        placeholder="e.g. 100% Combed Cotton"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                      <datalist id="fabric-options">
                        {FASHION_FABRIC_OPTIONS.map((f) => (
                          <option key={f} value={f} />
                        ))}
                      </datalist>
                    </div>

                    {/* Fit */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fit</label>
                      <input
                        list="fit-options"
                        value={fit}
                        onChange={(e) => setFit(e.target.value)}
                        placeholder="e.g. Oversized / Boxy"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                      <datalist id="fit-options">
                        {FASHION_FIT_OPTIONS.map((f) => (
                          <option key={f} value={f} />
                        ))}
                      </datalist>
                    </div>

                    {/* Pattern */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Pattern</label>
                      <input
                        list="pattern-options"
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                        placeholder="e.g. Solid Plain"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                      <datalist id="pattern-options">
                        {FASHION_PATTERN_OPTIONS.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Sleeve */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Sleeve</label>
                      <input
                        list="sleeve-options"
                        value={sleeve}
                        onChange={(e) => setSleeve(e.target.value)}
                        placeholder="e.g. Half Sleeve"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                      <datalist id="sleeve-options">
                        {FASHION_SLEEVE_OPTIONS.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </div>

                    {/* Neck / Collar */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Neck / Collar</label>
                      <input
                        list="neck-options"
                        value={neck}
                        onChange={(e) => setNeck(e.target.value)}
                        placeholder="e.g. Crew Neck"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                      <datalist id="neck-options">
                        {FASHION_NECK_OPTIONS.map((n) => (
                          <option key={n} value={n} />
                        ))}
                      </datalist>
                    </div>

                    {/* Occasion */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Occasion</label>
                      <input
                        list="occasion-options"
                        value={occasion}
                        onChange={(e) => setOccasion(e.target.value)}
                        placeholder="e.g. Streetwear"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                      />
                      <datalist id="occasion-options">
                        {FASHION_OCCASION_OPTIONS.map((o) => (
                          <option key={o} value={o} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wash &amp; Care Instructions
                </label>
                <Input
                  value={careInstructions}
                  onChange={(e) => setCareInstructions(e.target.value)}
                  placeholder="Machine wash cold inside out. Do not tumble dry. Warm iron."
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT 1 COLUMN: PRICING, MERCHANDISING, INVENTORY, SEO & PUBLISHING       */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          {/* SECTION 5: PRICING & MARGINS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>5. Pricing &amp; Margins</CardTitle>
              <CardDescription>Default INR pricing applied across variants.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Selling Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <Input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="1499"
                    className="h-9 text-xs pl-7 font-mono font-semibold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compare-at Price / MRP (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <Input
                    type="number"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    placeholder="2499"
                    className="h-9 text-xs pl-7 font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Shows strike-through price on storefront</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Price (₹) <span className="text-slate-400 font-normal">(Private)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <Input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="450"
                    className="h-9 text-xs pl-7 font-mono text-slate-600"
                  />
                </div>
                {profitMargin && (
                  <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200 flex items-center justify-between text-xs">
                    <span className="text-emerald-800 font-medium">Estimated Gross Margin:</span>
                    <span className="font-mono font-bold text-emerald-900">{profitMargin}%</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 6: CATEGORY & BRAND MERCHANDISING */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>6. Merchandising &amp; Registry</CardTitle>
              <CardDescription>Assign brand, category taxonomy, and curations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(!showAddCategory)}
                    className="text-[11px] text-indigo-600 hover:underline font-medium"
                  >
                    + Add New Category
                  </button>
                </div>

                {showAddCategory ? (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 mb-2">
                    <Input
                      placeholder="Category name (e.g. Hoodies)"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddCategory(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateCategory}
                        className="h-7 text-xs bg-slate-900 text-white"
                      >
                        Create
                      </Button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                    required
                  >
                    <option value="">Select Category...</option>
                    {availableCategories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Brand */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Brand</label>
                  <button
                    type="button"
                    onClick={() => setShowAddBrand(!showAddBrand)}
                    className="text-[11px] text-indigo-600 hover:underline font-medium"
                  >
                    + Add Brand
                  </button>
                </div>

                {showAddBrand ? (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 mb-2">
                    <Input
                      placeholder="Brand name (e.g. VogueThreads Originals)"
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="flex justify-end gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddBrand(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateBrand}
                        className="h-7 text-xs bg-slate-900 text-white"
                      >
                        Create Brand
                      </Button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="">Select Brand (Optional)...</option>
                    {availableBrands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Collections Multi-Select */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Collections</label>
                {availableCollections.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No collections created yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                    {availableCollections.map((col) => {
                      const isChecked = selectedCollectionIds.includes(col._id);
                      return (
                        <label
                          key={col._id}
                          className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-white p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedCollectionIds(
                                  selectedCollectionIds.filter((id) => id !== col._id)
                                );
                              } else {
                                setSelectedCollectionIds([...selectedCollectionIds, col._id]);
                              }
                            }}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span>{col.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 7: INVENTORY SUMMARY (Telemetry from Inventory Module) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>7. Inventory Telemetry</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Read-Only Link
                </Badge>
              </div>
              <CardDescription>Live warehouse quantities synced with Inventory module.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Available</span>
                  <span className="text-base font-bold font-mono text-slate-900">
                    {variants.reduce((acc, v) => acc + (v.inventory?.available || 0), 0)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Reserved</span>
                  <span className="text-base font-bold font-mono text-slate-600">
                    {variants.reduce((acc, v) => acc + (v.inventory?.reserved || 0), 0)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">SKUs Tracked</span>
                  <span className="text-base font-bold font-mono text-indigo-600">{variants.length}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Warehouse receipts and stock adjustments are managed exclusively through the{" "}
                <Link href="/inventory" className="text-indigo-600 underline font-medium">
                  Inventory
                </Link>{" "}
                module.
              </p>
            </CardContent>
          </Card>

          {/* SECTION 8: SEO & SEARCH PREVIEW */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>8. SEO &amp; Meta Tags</CardTitle>
              <CardDescription>Search engine appearance and meta description.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meta Title</label>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={title ? `${title} | VogueThreads India` : "Meta Title"}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meta Description</label>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Buy premium clothing online at VogueThreads. Fast shipping across India."
                  rows={2}
                  className="text-xs"
                />
              </div>

              {/* SERP Snippet Preview */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                  Google Search Snippet Preview
                </span>
                <p className="text-xs font-semibold text-blue-700 truncate">
                  {metaTitle || title || "VogueThreads Apparel"} | VogueThreads
                </p>
                <p className="text-[10px] text-emerald-700 truncate">
                  https://voguethreads.in/products/{slug || "apparel-style"}
                </p>
                <p className="text-[11px] text-slate-600 line-clamp-2">
                  {metaDescription ||
                    shortDescription ||
                    "Explore premium fashion clothing made from fine combed fabrics with impeccable tailoring."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 9: PUBLISHING LIFECYCLE */}
          <Card className="border-slate-900 shadow-dropdown">
            <CardHeader className="pb-3 bg-slate-900 text-white rounded-t-lg">
              <CardTitle className="text-white flex items-center justify-between">
                <span>9. Publishing Lifecycle</span>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </CardTitle>
              <CardDescription className="text-slate-400">
                Catalog publication state and visibility control.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catalog Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="DRAFT">Draft (Hidden from Storefront)</option>
                  <option value="SCHEDULED">Scheduled (Publish on Date)</option>
                  <option value="PUBLISHED">Published (Live Catalog)</option>
                  <option value="ARCHIVED">Archived (Retired Style)</option>
                </select>
              </div>

              {status === "SCHEDULED" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Scheduled Publish Date &amp; Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-2"
              >
                <Save className={`h-4 w-4 ${isSubmitting ? "animate-spin" : ""}`} />
                <span>{isSubmitting ? "Saving Document..." : isEditMode ? "Save Changes" : "Save & Publish"}</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
