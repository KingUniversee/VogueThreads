"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  SlidersHorizontal,
  Sparkles,
  Edit2,
  Trash2,
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  Calendar,
  X,
  Palette,
  CheckSquare,
  ListFilter,
  FileText,
  Hash,
  ToggleLeft,
  Info,
  Check,
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
import { getAttributeTypeBadge } from "./attribute-list-view";

export function AttributeDetailView({ attributeId }) {
  const router = useRouter();

  const [attribute, setAttribute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load Attribute Details from API
  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/attributes/${attributeId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Attribute not found");
      }

      setAttribute(json.data);
    } catch (err) {
      setErrorMessage(err.message || "Failed to load attribute details");
    } finally {
      setIsLoading(false);
    }
  }, [attributeId]);

  useEffect(() => {
    if (attributeId) {
      fetchDetails();
    }
  }, [attributeId, fetchDetails]);

  // Safe Delete Handler
  const handleConfirmDelete = async () => {
    if (!attribute) return;

    if (attribute.productCount > 0) {
      setErrorMessage(
        `Cannot delete attribute "${attribute.name}". It is currently assigned to ${attribute.productCount} active product(s).`
      );
      setIsDeleteOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/attributes/${attributeId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete attribute");
      }

      router.push("/attributes");
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
        <p className="text-xs text-slate-500 font-medium">Loading attribute details...</p>
      </div>
    );
  }

  if (errorMessage && !attribute) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Attribute Not Found</h2>
        <p className="text-xs text-slate-500">{errorMessage}</p>
        <Button asChild size="sm" className="text-xs bg-slate-900 hover:bg-slate-800 text-white">
          <Link href="/attributes">Back to Attributes List</Link>
        </Button>
      </div>
    );
  }

  const typeBadge = getAttributeTypeBadge(attribute.type);
  const TypeIcon = typeBadge.icon;
  const hasOptions = ["SELECT", "MULTISELECT", "COLOR"].includes(attribute.type);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
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
          <Link href="/attributes">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Attributes
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs border-slate-200 text-slate-700"
          >
            <Link href={`/attributes/${attribute._id}/edit`}>
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit Attribute
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

      {/* HEADER HERO CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <SlidersHorizontal className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{attribute.name}</h1>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase font-bold tracking-wider ${
                    attribute.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {attribute.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium gap-1 ${typeBadge.className}`}
                >
                  <TypeIcon className="h-3 w-3 shrink-0" />
                  {typeBadge.label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-600">
                  code: {attribute.code}
                </span>
                {attribute.isFilterable && (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-medium">
                    <Check className="h-3 w-3" /> Storefront Filter
                  </span>
                )}
                {attribute.isRequired && (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-medium">
                    Mandatory Field
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {attribute.description && (
          <p className="text-xs text-slate-600 mt-4 pt-4 border-t border-slate-100 leading-relaxed">
            {attribute.description}
          </p>
        )}
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Option Choices
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {hasOptions ? attribute.options?.length || 0 : "Direct"}
              </h3>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <ListFilter className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Assigned Products
              </p>
              <h3 className="text-xl font-bold text-indigo-600 mt-0.5">
                {attribute.productCount || 0}
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
                  attribute.isActive ? "text-emerald-600" : "text-slate-500"
                }`}
              >
                {attribute.isActive ? "Active" : "Inactive"}
              </h3>
            </div>
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                attribute.isActive
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {attribute.isActive ? (
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
                Last Updated
              </p>
              <h3 className="text-xs font-bold text-slate-800 mt-1">
                {new Date(attribute.updatedAt || attribute.createdAt).toLocaleDateString("en-IN", {
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
      </div>

      {/* DETAILS & CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* OPTIONS TABLE */}
          {hasOptions ? (
            <Card className="bg-white border-slate-200 shadow-2xs">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Configured Values / Options
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Predefined options selectable in apparel product specifications.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {attribute.options?.length || 0} Options
                </Badge>
              </CardHeader>
              <CardContent>
                {attribute.options?.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                          <th className="py-2.5 px-3">Option Label</th>
                          <th className="py-2.5 px-3">Slug Key</th>
                          {attribute.type === "COLOR" && (
                            <th className="py-2.5 px-3">Color Swatch</th>
                          )}
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attribute.options.map((opt, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{opt.label}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{opt.value}</td>
                            {attribute.type === "COLOR" && (
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-4 w-4 rounded-full border border-slate-300 shadow-2xs"
                                    style={{ backgroundColor: opt.hex || "#000000" }}
                                  />
                                  <span className="font-mono text-slate-700">{opt.hex}</span>
                                </div>
                              </td>
                            )}
                            <td className="py-2.5 px-3 text-right">
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  opt.isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-400 border-slate-200"
                                }`}
                              >
                                {opt.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    No options configured yet. Click &ldquo;Edit Attribute&rdquo; to define choices.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white border-slate-200 shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Direct Input Specifications
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Specification values are entered directly into each product.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-3 text-xs text-slate-600">
                  <Info className="h-5 w-5 text-indigo-600 shrink-0" />
                  <span>
                    This attribute accepts direct{" "}
                    <strong className="text-slate-800">{attribute.type.toLowerCase()}</strong> input
                    without a fixed options list.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ASSIGNED PRODUCTS SHOWCASE */}
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Products Using This Attribute
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Apparel items currently referencing this specification.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {attribute.productCount || 0} Total
              </Badge>
            </CardHeader>
            <CardContent>
              {attribute.sampleProducts?.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                  {attribute.sampleProducts.map((product) => (
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
                        <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {product.matchedValue}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-900">
                          ₹{(product.price ?? 0).toLocaleString("en-IN")}
                        </span>
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
                    No products using this attribute yet
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    When apparel products specify this attribute in the Product Catalog, they will
                    appear here.
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

        {/* SIDEBAR: AUDIT & REGISTRY INFO */}
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                Registry Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Created By</span>
                <span className="font-medium text-slate-800">
                  {attribute.createdBy || "System"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Updated By</span>
                <span className="font-medium text-slate-800">
                  {attribute.updatedBy || "System"}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Display Order</span>
                <span className="font-mono text-slate-800">{attribute.sortOrder || 0}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Database ID</span>
                <span className="font-mono text-[10px] text-slate-600 truncate max-w-[140px]">
                  {attribute._id}
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
                  attribute.productCount > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {attribute.productCount > 0 ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {attribute.productCount > 0 ? "Cannot Delete Attribute" : "Delete Attribute"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {attribute.name} ({attribute.code})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2">
            {attribute.productCount > 0 ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Protected Attribute Reference
                </div>
                <p>
                  This attribute is currently assigned to{" "}
                  <strong>
                    {attribute.productCount}{" "}
                    {attribute.productCount === 1 ? "product" : "products"}
                  </strong>
                  .
                </p>
                <p className="text-[11px] text-amber-700">
                  To prevent breaking technical apparel specifications on active products, please
                  reassign or remove this attribute from those products before attempting deletion.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900">&ldquo;{attribute.name}&rdquo;</strong>? This
                will remove the attribute definition and all its configured values. This action
                cannot be undone.
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
            {attribute.productCount > 0 ? (
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
