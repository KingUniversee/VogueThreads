"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Tag,
  Sparkles,
  Edit2,
  Trash2,
  Globe,
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Calendar,
  X,
  Building2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function BrandDetailView({ brandId }) {
  const router = useRouter();

  const [brand, setBrand] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Brand Details from API
  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/brands/${brandId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Brand not found");
      }

      setBrand(json.data);
    } catch (err) {
      setErrorMessage(err.message || "Failed to load brand details");
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    if (brandId) {
      fetchDetails();
    }
  }, [brandId, fetchDetails]);

  // Safe Delete Handler
  const handleConfirmDelete = async () => {
    if (!brand) return;

    if (brand.productCount > 0) {
      setErrorMessage(
        `Cannot delete brand "${brand.name}". It is currently assigned to ${brand.productCount} active product(s).`
      );
      setIsDeleteOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete brand");
      }

      router.push("/brands");
    } catch (err) {
      setErrorMessage(err.message || "Deletion failed");
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center max-w-5xl mx-auto space-y-3">
        <RefreshCw className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading brand overview...</p>
      </div>
    );
  }

  if (errorMessage && !brand) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Brand Not Found</h2>
        <p className="text-xs text-slate-500">{errorMessage}</p>
        <Button asChild size="sm" className="text-xs bg-slate-900 hover:bg-slate-800 text-white">
          <Link href="/brands">Back to Brands List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-950 text-emerald-100 rounded-lg shadow-xl border border-emerald-800/80">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{successToast}</span>
          <button
            type="button"
            onClick={() => setSuccessToast("")}
            className="ml-2 text-emerald-400 hover:text-emerald-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
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

      {/* TOP NAVIGATION */}
      <div className="flex items-center justify-between">
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs border-slate-200 text-slate-700"
          >
            <Link href={`/brands/${brand._id}/edit`}>
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit Brand
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* HERO BANNER & BRAND IDENTITY CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {/* Cover Banner */}
        <div className="h-44 sm:h-56 w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
          {brand.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.coverImageUrl}
              alt={`${brand.name} banner`}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Brand Inset Header */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              {/* Brand Logo Avatar */}
              <div className="h-24 w-24 rounded-2xl bg-white p-1.5 border-2 border-white shadow-md overflow-hidden shrink-0">
                <div className="h-full w-full rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="h-full w-full object-contain p-1"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <span
                    className={`font-bold text-lg text-slate-700 uppercase ${
                      brand.logoUrl ? "hidden" : "flex"
                    }`}
                  >
                    {brand.name.slice(0, 2)}
                  </span>
                </div>
              </div>

              {/* Brand Titles */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{brand.name}</h1>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      brand.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {brand.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-600">
                    /brands/{brand.slug}
                  </span>

                  {brand.website && (
                    <a
                      href={
                        brand.website.startsWith("http")
                          ? brand.website
                          : `https://${brand.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>{brand.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Assigned Products
              </p>
              <h3 className="text-xl font-bold text-indigo-600 mt-0.5">
                {brand.productCount || 0}
              </h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Storefront Status
              </p>
              <h3
                className={`text-xl font-bold mt-0.5 ${
                  brand.isActive ? "text-emerald-600" : "text-slate-500"
                }`}
              >
                {brand.isActive ? "Active" : "Inactive"}
              </h3>
            </div>
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                brand.isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {brand.isActive ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Registered Date
              </p>
              <h3 className="text-xs font-bold text-slate-800 mt-1">
                {new Date(brand.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Calendar className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Last Updated
              </p>
              <h3 className="text-xs font-bold text-slate-800 mt-1">
                {new Date(brand.updatedAt || brand.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <RefreshCw className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* STORY & OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Brand Heritage & Story */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Brand Heritage & Story
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Design philosophy, background, and apparel aesthetic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brand.description ? (
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {brand.description}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No brand story or description provided yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ASSIGNED PRODUCTS SHOWCASE */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Assigned Products
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Apparel items associated with this designer brand.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {brand.productCount} Total
              </Badge>
            </CardHeader>
            <CardContent>
              {brand.sampleProducts?.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {brand.sampleProducts.map((product) => (
                    <div
                      key={product._id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {product.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/products/${product._id}`}
                            className="text-xs font-semibold text-slate-900 hover:text-indigo-600 block truncate"
                          >
                            {product.title}
                          </Link>
                          <span className="text-[11px] text-slate-400">
                            {product.categoryName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-semibold text-slate-900">
                          ₹{(product.price ?? 0).toLocaleString("en-IN")}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold text-slate-600"
                        >
                          {product.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center max-w-sm mx-auto space-y-2">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Package className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">
                    No products linked to this brand yet
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Assign this brand to apparel products inside the Product Catalog to have them
                    featured under this brand showcase.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="text-xs h-8 mt-2 border-slate-200"
                  >
                    <Link href="/products">Go to Products</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR: SEO & METADATA */}
        <div className="space-y-6">
          {/* SEO Details */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Search Engine Snippet
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block truncate">
                  https://voguethreads.in › brands › {brand.slug}
                </span>
                <h4 className="text-xs font-bold text-blue-800 truncate">
                  {brand.seo?.metaTitle || `${brand.name} | VogueThreads India`}
                </h4>
                <p className="text-[11px] text-slate-600 line-clamp-3">
                  {brand.seo?.metaDescription ||
                    brand.description ||
                    "Shop luxury designer clothing and accessories at VogueThreads India."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Audit & Registry Info */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Registry Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Created By</span>
                <span className="font-medium text-slate-800">{brand.createdBy || "System"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Updated By</span>
                <span className="font-medium text-slate-800">{brand.updatedBy || "System"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Database ID</span>
                <span className="font-mono text-[10px] text-slate-600 truncate max-w-[140px]">
                  {brand._id}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SAFE DELETE DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center ${
                  brand.productCount > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {brand.productCount > 0 ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {brand.productCount > 0 ? "Cannot Delete Brand" : "Delete Brand"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {brand.name} ({brand.slug})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            {brand.productCount > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Protected Brand Reference
                </div>
                <p>
                  This brand is currently linked to{" "}
                  <strong>
                    {brand.productCount} {brand.productCount === 1 ? "product" : "products"}
                  </strong>
                  .
                </p>
                <p className="text-[11px] text-amber-700">
                  To prevent broken references in your apparel catalog, please reassign or remove this
                  brand from those products before attempting deletion.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900">&ldquo;{brand.name}&rdquo;</strong>? This will remove the
                brand registry entry and all associated metadata. This action cannot be undone.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              className="text-xs h-8 border-slate-200"
            >
              Cancel
            </Button>
            {brand.productCount > 0 ? (
              <Button
                size="sm"
                disabled
                className="text-xs h-8 bg-slate-300 text-slate-500 cursor-not-allowed"
              >
                Deletion Blocked
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="text-xs h-8 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
