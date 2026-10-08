"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Tag,
  Sparkles,
  Globe,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  X,
  Eye,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function BrandForm({ initialBrand = null, isEditMode = false }) {
  const router = useRouter();

  // Basic Information
  const [name, setName] = useState(initialBrand?.name || "");
  const [slug, setSlug] = useState(initialBrand?.slug || "");
  const [isManualSlug, setIsManualSlug] = useState(Boolean(initialBrand?.slug));
  const [website, setWebsite] = useState(initialBrand?.website || "");
  const [description, setDescription] = useState(initialBrand?.description || "");

  // Brand Media Assets
  const [logoUrl, setLogoUrl] = useState(initialBrand?.logoUrl || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialBrand?.coverImageUrl || "");

  // Visibility & Status
  const [isActive, setIsActive] = useState(
    initialBrand?.isActive !== undefined ? initialBrand.isActive : true
  );

  // SEO Metadata
  const [metaTitle, setMetaTitle] = useState(initialBrand?.seo?.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(
    initialBrand?.seo?.metaDescription || ""
  );

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Helper to slugify a string
  const slugify = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Auto-generate slug when name changes if user hasn't manually overridden it
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!isManualSlug) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e) => {
    setIsManualSlug(true);
    setSlug(slugify(e.target.value));
  };

  const handleResetSlug = () => {
    setIsManualSlug(false);
    setSlug(slugify(name));
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("Brand name is required.");
      return;
    }

    const finalSlug = slugify(slug || name);
    if (!finalSlug) {
      setErrorMessage("A valid URL slug is required.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      slug: finalSlug,
      description: description.trim(),
      website: website.trim(),
      logoUrl: logoUrl.trim(),
      coverImageUrl: coverImageUrl.trim(),
      isActive: Boolean(isActive),
      seo: {
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim(),
      },
    };

    try {
      const url = isEditMode ? `/api/brands/${initialBrand._id}` : "/api/brands";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save brand");
      }

      setSuccessMessage(
        isEditMode
          ? `Brand "${json.data.name}" updated successfully.`
          : `Brand "${json.data.name}" registered successfully.`
      );

      setTimeout(() => {
        router.push("/brands");
        router.refresh();
      }, 700);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred while saving the brand.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* HEADER & NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-8 px-2 text-slate-500 hover:text-slate-900"
            >
              <Link href="/brands">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Brands
              </Link>
            </Button>
            <Badge
              variant="outline"
              className={`text-[10px] uppercase font-bold tracking-wider ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {isEditMode ? `Edit Brand: ${initialBrand?.name || name}` : "Register New Brand"}
          </h1>
          <p className="text-xs text-slate-500">
            {isEditMode
              ? "Update brand details, visual assets, external links, and SEO configuration."
              : "Register a designer label, fashion house, or luxury manufacturer to associate with products."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs border-slate-200">
            <Link href="/brands">Cancel</Link>
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="sm"
            className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white min-w-[120px] shadow-2xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : isEditMode ? (
              "Save Brand"
            ) : (
              "Register Brand"
            )}
          </Button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {errorMessage && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage("")}
            className="text-rose-500 hover:text-rose-800"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* FORM SECTIONS */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. BASIC INFORMATION */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                <Tag className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  1. Brand Identity & Overview
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Core identification details, registry name, and web address.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Brand Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Brand Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Ralph Lauren, Gucci, VogueThreads Studio"
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Brand Slug */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  {isManualSlug && (
                    <button
                      type="button"
                      onClick={handleResetSlug}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 h-9 rounded-l-md border border-r-0 border-slate-200 bg-slate-50 text-slate-400 text-xs font-mono select-none">
                    /brands/
                  </span>
                  <Input
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="brand-name"
                    className="h-9 text-xs font-mono rounded-l-none"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Unique identifier used in search queries, API filters, and storefront URL paths.
                </p>
              </div>
            </div>

            {/* Official Website */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Official Website / External Link
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.brandwebsite.com"
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                {website && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-9 text-xs border-slate-200 shrink-0"
                  >
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Test Link
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Brand Description / Story */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Brand Heritage & Story
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share the brand's history, design philosophy, craftsmanship values, and luxury aesthetic..."
                rows={4}
                className="text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Displayed on brand showcase landing pages and customer product story drawers.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. BRAND MEDIA ASSETS */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  2. Brand Media Assets
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Square brand logo avatar and high-resolution cover banner image.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-1">
            {/* Brand Logo */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Brand Logo URL (Square 1:1 or Vector)
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1 w-full">
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or https://cdn.brand.com/logo.png"
                    className="h-9 text-xs"
                  />
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Logo Preview Box */}
                <div className="h-16 w-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt={name || "Brand logo preview"}
                      className="h-full w-full object-contain p-1.5"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`h-full w-full items-center justify-center bg-slate-100 text-slate-400 text-xs font-bold uppercase ${
                      logoUrl ? "hidden" : "flex"
                    }`}
                  >
                    {name ? name.slice(0, 2) : <Tag className="h-5 w-5" />}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                Recommended: 400×400px transparent PNG or SVG for crisp display on dark and light backgrounds.
              </p>
            </div>

            {/* Cover / Banner Image */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                Brand Cover Banner Image URL (16:9 Landscape)
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-... (1920×600 hero banner)"
                    className="h-9 text-xs"
                  />
                  {coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Banner Preview Box */}
                <div className="w-full h-32 sm:h-40 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden relative flex items-center justify-center shadow-2xs">
                  {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImageUrl}
                      alt="Brand cover banner preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`h-full w-full flex-col items-center justify-center bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-400 p-4 text-center ${
                      coverImageUrl ? "hidden" : "flex"
                    }`}
                  >
                    <ImageIcon className="h-7 w-7 text-slate-600 mb-1" />
                    <span className="text-xs font-medium text-slate-400">
                      Cover Banner Preview
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Enter image URL above to preview brand showcase header
                    </span>
                  </div>

                  {/* Brand badge overlay preview */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10 text-white">
                    <span className="text-xs font-semibold">{name || "Brand Name"}</span>
                    <Badge variant="outline" className="text-[9px] text-white/80 border-white/20">
                      Showcase Banner
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. VISIBILITY & STATUS */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  3. Catalog Visibility & Status
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Control whether this brand is active and selectable across the admin and storefront.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Active Brand Registration
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {isActive ? "Active in Catalog" : "Inactive / Hidden"}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 max-w-xl">
                  When active, this brand can be linked to products and appears in storefront filter
                  menus. When inactive, existing products remain untouched, but the brand is hidden
                  from public browsing.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>

        {/* 4. SEARCH ENGINE OPTIMIZATION (SEO) */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  4. Search Engine Optimization (SEO)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Customize Google search engine results snippets and social sharing metadata.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Meta Title</label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {metaTitle.length}/60 chars
                  </span>
                </div>
                <Input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder={name ? `${name} | VogueThreads India` : "Luxury Designer Label"}
                  className="h-9 text-xs"
                  maxLength={70}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Meta Description
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {metaDescription.length}/160 chars
                  </span>
                </div>
                <Textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Discover exclusive designer fashion by this luxury brand at VogueThreads India with pan-India express shipping."
                  rows={2}
                  className="text-xs"
                  maxLength={180}
                />
              </div>
            </div>

            {/* Live Google Search Preview */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Google Search Snippet Preview
              </span>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-500 font-mono block truncate">
                  https://voguethreads.in › brands › {slug || "brand-slug"}
                </span>
                <h4 className="text-sm font-semibold text-blue-800 hover:underline cursor-pointer truncate">
                  {metaTitle || (name ? `${name} | VogueThreads India` : "Brand Name | VogueThreads")}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {metaDescription ||
                    description ||
                    "Explore curated clothing collections and signature fashion from this designer brand at VogueThreads India."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BOTTOM ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs border-slate-200">
            <Link href="/brands">Cancel</Link>
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white min-w-[140px] shadow-2xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Register Brand"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
