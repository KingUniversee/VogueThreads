"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Archive,
  Shirt,
  Layers,
  IndianRupee,
  ShieldCheck,
  Calendar,
  Globe,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Boxes,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatDate } from "@/lib/formatters";

export function ProductDetailView({ product }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!product) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
        Product record not found.
      </div>
    );
  }

  const variants = product.variants || [];
  const primaryImages = product.primaryImages || [];
  const totalAvailableStock = variants.reduce(
    (acc, v) => acc + (v.inventory?.available || 0),
    0
  );
  const totalReservedStock = variants.reduce(
    (acc, v) => acc + (v.inventory?.reserved || 0),
    0
  );

  const basePrice = variants[0]?.price || 0;
  const compareAtPrice = variants[0]?.compareAtPrice;
  const costPrice = variants[0]?.costPrice;
  const margin =
    basePrice > 0 && costPrice > 0
      ? (((basePrice - costPrice) / basePrice) * 100).toFixed(1)
      : null;

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const res = await fetch(`/api/products/${product._id}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Duplication failed");
      router.push(`/products/${json.data._id}`);
    } catch (err) {
      alert(err.message || "Could not duplicate product");
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete or archive '${product.title}'? If referenced in past orders, it will be safely soft-deleted/archived.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${product._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Deletion failed");
      router.push("/products");
    } catch (err) {
      alert(err.message || "Could not delete product");
      setIsDeleting(false);
    }
  };

  const statusVariant =
    {
      PUBLISHED: "success",
      DRAFT: "default",
      SCHEDULED: "info",
      ARCHIVED: "danger",
    }[product.status] || "default";

  return (
    <div className="space-y-6 antialiased pb-16 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* TOP HEADER: BREADCRUMBS, STATUS, TITLE & ACTIONS                          */}
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
            <span className="text-xs font-mono text-slate-500">
              {product.variants?.[0]?.sku || product.slug}
            </span>
            <Badge variant={statusVariant} className="text-[10px] font-mono font-bold uppercase">
              {product.status}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {product.title}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={isDuplicating}
            onClick={handleDuplicate}
            className="h-9 text-xs"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            <span>Duplicate</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
            className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            <span>Archive / Delete</span>
          </Button>

          <Button
            size="sm"
            asChild
            className="h-9 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white"
          >
            <Link href={`/products/${product._id}/edit`}>
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              <span>Edit Style</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE KPI SUMMARY CARDS                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Base Selling Price */}
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1">
            Selling Price (INR)
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatINR(basePrice, false)}
          </div>
          {compareAtPrice && compareAtPrice > basePrice && (
            <p className="text-[11px] text-slate-400 mt-1 line-through font-mono">
              MRP: {formatINR(compareAtPrice, false)}
            </p>
          )}
        </Card>

        {/* Margin */}
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1">
            Gross Margin %
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {margin ? `${margin}%` : "—"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {costPrice ? `Cost: ${formatINR(costPrice, false)}` : "No cost price configured"}
          </p>
        </Card>

        {/* Total Available Warehouse Stock */}
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1">
            Warehouse Stock
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {totalAvailableStock}{" "}
            <span className="text-xs font-normal text-slate-400">units avail</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalReservedStock} units reserved in orders
          </p>
        </Card>

        {/* Variants Count */}
        <Card className="p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 block mb-1">
            Matrix Combinations
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-600">
            {variants.length}{" "}
            <span className="text-xs font-normal text-slate-400">SKUs</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Tax: GST {product.gstRate || 5}% • HSN {product.hsnCode || "6109"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========================================================================= */}
        {/* LEFT 2 COLS: IMAGERY, VARIANTS TABLE & SPECIFICATIONS                     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* Media & Details Gallery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Apparel Imagery &amp; Lookbook</CardTitle>
              <CardDescription>Visual assets, colorways, and editorial shots.</CardDescription>
            </CardHeader>
            <CardContent>
              {primaryImages.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs">
                  No images uploaded for this style.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active Featured Image */}
                  <div className="aspect-[16/9] sm:aspect-[21/9] rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={primaryImages[activeImageIndex]?.url}
                      alt={primaryImages[activeImageIndex]?.alt || product.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Thumbnail Row */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {primaryImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`h-14 w-14 rounded border-2 overflow-hidden shrink-0 transition-colors ${
                          activeImageIndex === idx
                            ? "border-slate-900 shadow-sm"
                            : "border-slate-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.alt || "Thumb"} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variants & Live Warehouse Inventory Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Colorway &amp; Size Variants ({variants.length})</CardTitle>
                  <CardDescription>
                    Live telemetry aggregated from the warehouse Inventory collection.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                  <Link href="/inventory">View in Inventory →</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-left">
                      <th className="p-3">Color &amp; Size</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Barcode</th>
                      <th className="p-3 text-center">Available Stock</th>
                      <th className="p-3 text-center">Reserved</th>
                      <th className="p-3 text-center">Stock State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((v) => {
                      const inv = v.inventory || { available: 0, reserved: 0, status: "OUT_OF_STOCK" };
                      const stockVariant =
                        {
                          IN_STOCK: "success",
                          LOW_STOCK: "warning",
                          OUT_OF_STOCK: "danger",
                        }[inv.status] || "default";

                      return (
                        <tr key={v.sku} className="hover:bg-slate-50/50 transition-colors">
                          {/* Color & Size */}
                          <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0"
                                style={{ backgroundColor: v.color?.hex || "#000000" }}
                              />
                              <span>{v.color?.name || "Standard"}</span>
                              <span className="font-mono text-slate-400">/</span>
                              <Badge variant="outline" className="font-mono font-bold text-[10px]">
                                {v.size}
                              </Badge>
                            </div>
                          </td>

                          {/* SKU */}
                          <td className="p-3 font-mono font-semibold text-slate-700 whitespace-nowrap">
                            {v.sku}
                          </td>

                          {/* Price */}
                          <td className="p-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {formatINR(v.price, false)}
                          </td>

                          {/* Barcode */}
                          <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                            {v.barcode || "—"}
                          </td>

                          {/* Available Stock */}
                          <td className="p-3 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                            {inv.available}
                          </td>

                          {/* Reserved */}
                          <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">
                            {inv.reserved}
                          </td>

                          {/* Stock Status Badge */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <Badge variant={stockVariant} className="text-[10px] font-medium">
                              {inv.status?.replace("_", " ")}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Fashion Attributes Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Technical Apparel Specifications</CardTitle>
              <CardDescription>Composition, silhouette, neckline, and care tags.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {(product.attributes || []).map((attr, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      {attr.name}
                    </span>
                    <span className="font-semibold text-slate-800">{attr.value}</span>
                  </div>
                ))}
              </div>

              {product.careInstructions?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Care Instructions:
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {product.careInstructions.join(" • ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT 1 COL: MERCHANDISING, DESCRIPTIONS & SEO                            */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          {/* Merchandising Details */}
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Merchandising Registry
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Category</span>
                <span className="font-semibold text-slate-900">
                  {product.categoryId?.name || "Uncategorized"}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Brand</span>
                <span className="font-semibold text-slate-900">
                  {product.brandId?.name || "None"}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Gender / Division</span>
                <span className="font-semibold text-slate-900">{product.gender || "UNISEX"}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">HSN Code</span>
                <span className="font-mono font-semibold text-slate-900">{product.hsnCode || "6109"}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">GST Rate</span>
                <span className="font-mono font-semibold text-emerald-600">
                  {product.gstRate || 5}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Published Date</span>
                <span className="font-mono text-slate-700">
                  {formatDate(product.publishAt || product.createdAt, { shortMonth: true })}
                </span>
              </div>
            </div>
          </Card>

          {/* Description Snippet */}
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Product Description
            </h3>
            {product.shortDescription && (
              <p className="text-xs font-medium text-slate-800 leading-relaxed italic">
                &ldquo;{product.shortDescription}&rdquo;
              </p>
            )}
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
              {product.description || "No full description provided."}
            </p>
          </Card>

          {/* SEO Preview */}
          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-indigo-600" />
              <span>Search Engine Listing Preview</span>
            </h3>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <p className="text-xs font-semibold text-blue-700 truncate">
                {product.metadata?.metaTitle || product.title} | VogueThreads
              </p>
              <p className="text-[10px] text-emerald-700 truncate">
                https://voguethreads.in/products/{product.slug}
              </p>
              <p className="text-[11px] text-slate-600 line-clamp-3">
                {product.metadata?.metaDescription ||
                  product.shortDescription ||
                  "Buy premium fashion apparel online at VogueThreads India."}
              </p>
            </div>
          </Card>

          {/* Audit Timestamps */}
          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-500 space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{formatDate(product.createdAt, { includeTime: true })}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated:</span>
              <span>{formatDate(product.updatedAt, { includeTime: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
