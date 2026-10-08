"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Sparkles,
  Edit2,
  Copy,
  Trash2,
  Archive,
  Calendar,
  Globe,
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Eye,
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

export function CollectionDetailView({ collectionId }) {
  const router = useRouter();

  const [collection, setCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successToast, setSuccessToast] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load collection details
  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/collections/${collectionId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Collection not found");
      }

      setCollection(json.data);
    } catch (err) {
      setErrorMessage(err.message || "Failed to load collection details");
    } finally {
      setIsLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    if (collectionId) {
      fetchDetails();
    }
  }, [collectionId, fetchDetails]);

  // Duplicate Collection
  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/collections/${collectionId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to duplicate");
      }
      router.push(`/collections/${json.data._id}/edit`);
    } catch (err) {
      setErrorMessage(err.message || "Duplication failed");
    }
  };

  // Safe Delete
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Deletion failed");
      }
      router.push("/collections");
    } catch (err) {
      setErrorMessage(err.message || "Deletion failed");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-400" />
        <p className="text-xs">Loading collection details...</p>
      </div>
    );
  }

  if (errorMessage || !collection) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-3">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {errorMessage || "Collection does not exist"}
        </div>
        <Button variant="outline" size="sm" asChild className="h-8 text-xs">
          <Link href="/collections">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Collections
          </Link>
        </Button>
      </div>
    );
  }

  const products = collection.resolvedProducts || [];
  const isRuleBased = collection.type === "RULE_BASED";

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Top Navigation & Actions Bar */}
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
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate max-w-sm">
              {collection.name}
            </h1>
            <Badge
              variant={
                collection.status === "PUBLISHED"
                  ? "success"
                  : collection.status === "SCHEDULED"
                  ? "info"
                  : collection.status === "ARCHIVED"
                  ? "danger"
                  : "default"
              }
              className="text-[10px] font-mono uppercase"
            >
              {collection.status}
            </Badge>
            {collection.isFeatured && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                Featured
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 font-mono">
            /collections/{collection.slug}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs">
            <Link href={`/collections/${collection._id}/edit`}>
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            className="h-9 text-xs"
          >
            <Copy className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
            Duplicate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        {collection.bannerUrl && (
          <div className="w-full h-40 bg-slate-100 overflow-hidden border-b border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={collection.bannerUrl}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-4">
            {collection.imageUrl && (
              <div className="h-16 w-16 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={collection.imageUrl}
                  alt={collection.name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-bold text-slate-900">{collection.name}</h2>
              <p className="text-xs text-slate-600">
                {collection.description || "No editorial description specified."}
              </p>
            </div>
          </div>

          {/* Metadata Badges & Timestamps Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Type</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                {isRuleBased ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    Rule-based
                  </>
                ) : (
                  <>
                    <Layers className="h-3.5 w-3.5 text-slate-700" />
                    Manual Curation
                  </>
                )}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Visibility</span>
              <span className="font-semibold mt-0.5 block">
                {collection.isActive ? (
                  <span className="text-emerald-600">Active (Visible)</span>
                ) : (
                  <span className="text-slate-400">Inactive</span>
                )}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Products</span>
              <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                {collection.productCount || 0} items
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Last Updated</span>
              <span className="font-mono text-slate-600 mt-0.5 block">
                {new Date(collection.updatedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rule-Based Conditions Breakdown (if Rule-Based) */}
      {isRuleBased && (
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Active Automated Rules ({collection.rules?.length || 0})
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                Match {collection.ruleMatchMode || "ALL"} Conditions
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Products matching these criteria are automatically resolved dynamically from MongoDB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(collection.rules || []).map((r, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-xs font-mono"
                >
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                    {r.field}
                  </span>
                  <span className="text-slate-500">
                    {r.operator === "EQUALS" ? "=" : r.operator}
                  </span>
                  <span className="font-bold text-slate-900">{r.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Showcase */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              {isRuleBased ? "Resolved Products" : "Curated Apparel Products"} ({products.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {isRuleBased
                ? "Live products currently matching the collection rules."
                : "Products ordered according to merchandising priority."}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="h-8 text-xs">
            <Link href={`/collections/${collection._id}/edit`}>
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Manage Products
            </Link>
          </Button>
        </CardHeader>

        {products.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="h-6 w-6 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No products associated</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isRuleBased
                ? "No products in database match the active rules."
                : "Add products to this collection in the editor."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {!isRuleBased && <th className="py-2.5 px-4 w-16">Pos</th>}
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Brand</th>
                  <th className="py-2.5 px-4">Price</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {products.map((p, idx) => {
                  const img =
                    p.primaryImages?.[0]?.url || p.variants?.[0]?.images?.[0]?.url || "";
                  const price = p.variants?.[0]?.price ? `₹${p.variants[0].price}` : "—";

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      {!isRuleBased && (
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-600">
                          #{p.position !== undefined ? p.position : idx + 1}
                        </td>
                      )}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={p.title} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[220px]">
                            <span className="font-semibold text-slate-900 truncate block">
                              {p.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {p.variants?.[0]?.sku || "No SKU"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {p.categoryId?.name || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {p.brandId?.name || "—"}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {price}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={p.status === "PUBLISHED" ? "success" : "default"}
                          className="text-[10px] font-mono"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                          <Link href={`/products/${p._id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {isDeleteOpen && (
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="max-w-md bg-white p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Delete Collection
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete &quot;{collection.name}&quot;?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1 my-2">
              <p className="font-semibold text-slate-800">Safe Deletion Guarantee:</p>
              <p className="text-[11px] text-slate-500">
                Associated products will NOT be deleted. They will simply be unlinked from this collection.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isDeleting}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
