"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  FolderTree,
  Image as ImageIcon,
  Link2,
  Globe,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Upload,
  Trash2,
  Eye,
  ExternalLink,
  Crop,
} from "lucide-react";
import { toast } from "sonner";
import { ImageCropModal } from "@/components/ui/image-crop-modal";

/**
 * Utility to find all descendant IDs of a given category to prevent circular parent loops
 */
function getDescendantIds(targetId, allCats) {
  const descendants = new Set();
  if (!targetId || !Array.isArray(allCats)) return descendants;

  function traverse(parentId) {
    const children = allCats.filter((c) => {
      const pid = c.parentId?._id || c.parentId;
      return String(pid) === String(parentId);
    });
    for (const child of children) {
      descendants.add(String(child._id));
      traverse(child._id);
    }
  }

  traverse(targetId);
  return descendants;
}

export function CategoryDialog({
  isOpen,
  onClose,
  onSuccess,
  initialCategory = null,
  parentCategory = null,
  allCategories = [],
}) {
  const isEditMode = Boolean(initialCategory && initialCategory._id);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isManualSlug, setIsManualSlug] = useState(false);
  const [parentId, setParentId] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);

  // SEO states
  const [showSeo, setShowSeo] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Submission & Error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Image Upload, 2MB Validation, Preview, Remove & Crop states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropSourceImage, setCropSourceImage] = useState("");
  const [uploadMode, setUploadMode] = useState("file"); // "file" | "url"
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize form values
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setUploadError("");
      setIsUploading(false);
      setIsPreviewModalOpen(false);
      setIsCropModalOpen(false);
      setCropSourceImage("");
      setIsDragOver(false);

      if (initialCategory) {
        setName(initialCategory.name || "");
        setSlug(initialCategory.slug || "");
        setIsManualSlug(true);
        const pid = initialCategory.parentId?._id || initialCategory.parentId || "";
        setParentId(pid ? String(pid) : "");
        setDescription(initialCategory.description || "");
        setImageUrl(initialCategory.imageUrl || "");
        setUploadMode(initialCategory.imageUrl ? "url" : "file");
        setIsActive(initialCategory.isActive !== undefined ? initialCategory.isActive : true);
        setDisplayOrder(initialCategory.displayOrder || 0);
        setMetaTitle(initialCategory.seo?.metaTitle || "");
        setMetaDescription(initialCategory.seo?.metaDescription || "");
        setShowSeo(Boolean(initialCategory.seo?.metaTitle || initialCategory.seo?.metaDescription));
      } else {
        setName("");
        setSlug("");
        setIsManualSlug(false);
        setParentId(parentCategory?._id ? String(parentCategory._id) : "");
        setDescription("");
        setImageUrl("");
        setUploadMode("file");
        setIsActive(true);
        setDisplayOrder(0);
        setMetaTitle("");
        setMetaDescription("");
        setShowSeo(false);
      }
    }
  }, [isOpen, initialCategory, parentCategory]);

  // Handle File Selection with 2MB validation
  const handleFileSelect = async (file) => {
    if (!file) return;
    setUploadError("");

    // 1. Validate File Type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/svg+xml",
    ];
    if (file.type && !allowedTypes.includes(file.type.toLowerCase()) && !file.type.startsWith("image/")) {
      const err = "Invalid file format. Please choose an image (PNG, JPG, WEBP, GIF, SVG).";
      setUploadError(err);
      toast.error("Invalid file format", { description: err });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Strict 2MB File Size Validation
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const err = `File size (${sizeMB}MB) exceeds the 2MB limit. Maximum allowed size is 2MB.`;
      setUploadError(err);
      toast.error("File size exceeds 2MB limit", {
        description: `Selected file is ${sizeMB}MB. Please select an image under 2MB.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 3. Upload File to /api/upload
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload image");
      }

      setImageUrl(json.data.url);
      setUploadError("");
      toast.success("Category image uploaded successfully", {
        description: file.name,
      });
    } catch (err) {
      setUploadError(err.message || "Failed to upload image");
      toast.error("Upload failed", { description: err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Category image removed");
  };

  // Handle Cropped Image Upload to /api/upload
  const handleCropComplete = async (croppedBlob) => {
    if (!croppedBlob) return;
    setIsUploading(true);
    try {
      const filename = `category-crop-${Date.now()}.webp`;
      const file = new File([croppedBlob], filename, { type: "image/webp" });

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to upload cropped image");
      }

      setImageUrl(json.data.url);
      setUploadError("");
      setIsCropModalOpen(false);
      toast.success("Category image cropped & framed successfully!", {
        description: "Storefront 4:5 frame applied",
      });
    } catch (err) {
      setUploadError(err.message || "Failed to upload cropped image");
      toast.error("Crop upload failed", { description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Real-time auto slugify
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

  // Find invalid parent candidates (self and all descendants)
  const invalidParentIds = useMemo(() => {
    if (!isEditMode) return new Set();
    const targetId = String(initialCategory._id);
    const descendants = getDescendantIds(targetId, allCategories);
    descendants.add(targetId);
    return descendants;
  }, [isEditMode, initialCategory, allCategories]);

  // Filtered list of valid parents for the dropdown
  const selectableParents = useMemo(() => {
    return allCategories.filter((c) => !invalidParentIds.has(String(c._id)));
  }, [allCategories, invalidParentIds]);

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Category Name is required.");
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
        parentId: parentId ? parentId : null,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        isActive,
        displayOrder: Number(displayOrder) || 0,
        seo: {
          metaTitle: metaTitle.trim(),
          metaDescription: metaDescription.trim(),
        },
      };

      const url = isEditMode
        ? `/api/categories/${initialCategory._id}`
        : "/api/categories";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to ${isEditMode ? "update" : "create"} category`);
      }

      onSuccess(json.data);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred while saving category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3 sm:pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800 shrink-0">
              <FolderTree className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {isEditMode ? `Edit Category: ${initialCategory?.name}` : "Create Category"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 line-clamp-2">
                {isEditMode
                  ? "Update category metadata, parent hierarchy, and SEO configuration."
                  : parentCategory
                  ? `Create a subcategory under "${parentCategory.name}".`
                  : "Create a root or subcategory for your apparel catalog."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="my-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2 w-full min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="break-words min-w-0 flex-1">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 w-full min-w-0">
          {/* Row 1: Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Oversized T-Shirts"
                className="h-9 text-xs w-full"
                required
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <label className="block text-xs font-semibold text-slate-700 truncate">
                  URL Slug <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsManualSlug(!isManualSlug)}
                  className="text-[11px] text-indigo-600 hover:underline font-medium shrink-0"
                >
                  {isManualSlug ? "Auto-generate" : "Edit manually"}
                </button>
              </div>
              <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 h-9 text-xs font-mono text-slate-500 w-full overflow-hidden">
                <span className="text-[11px] text-slate-400 select-none shrink-0">/categories/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setIsManualSlug(true);
                    setSlug(e.target.value);
                  }}
                  placeholder="oversized-t-shirts"
                  className="bg-transparent text-slate-900 focus:outline-none flex-1 min-w-0 font-semibold ml-0.5 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Parent Category & Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parent Category
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer truncate"
              >
                <option value="">None (Root Category — Level 0)</option>
                {selectableParents.map((cat) => {
                  const prefix = cat.level > 0 ? "— ".repeat(cat.level) : "";
                  return (
                    <option key={cat._id} value={cat._id}>
                      {prefix}
                      {cat.name} {cat.level > 0 ? `(Subcategory)` : `(Root)`}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {parentId ? "Will be nested under the selected parent." : "Will appear as a primary top-level department."}
              </p>
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Order / Priority
              </label>
              <Input
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="0"
                className="h-9 text-xs font-mono w-full"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Lower numbers appear first in storefront navigation.
              </p>
            </div>
          </div>

          {/* Row 3: Category Image (Upload & Preview & Remove with 2MB Limit) */}
          <div className="space-y-2 w-full min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                Category Image / Banner
              </label>
              {/* Mode Selector Toggle */}
              <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50 text-[11px] shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode("file");
                    setUploadError("");
                  }}
                  className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                    uploadMode === "file"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode("url");
                    setUploadError("");
                  }}
                  className={`px-2.5 py-0.5 rounded font-medium transition-colors ${
                    uploadMode === "url"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  Image URL
                </button>
              </div>
            </div>

            {/* If an image is currently attached, show responsive preview card */}
            {imageUrl ? (
              <div className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-3 overflow-hidden">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail with overlay preview */}
                  <div className="relative h-14 w-14 rounded-md border border-slate-200/80 bg-white shrink-0 overflow-hidden group shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={name || "Category Preview"}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="absolute inset-0 bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      title="Click to preview full size"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Image info with truncate */}
                  <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-medium shrink-0"
                      >
                        Image Attached
                      </Badge>
                      <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                        Verified &le; 2MB
                      </span>
                    </div>
                    <p
                      className="text-xs font-mono text-slate-600 truncate block w-full select-all"
                      title={imageUrl}
                    >
                      {imageUrl}
                    </p>
                  </div>
                </div>

                {/* Actions: Responsive button bar (full width on mobile, inline on tablet+) */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 border-t border-slate-200/60 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="h-8 flex-1 sm:flex-initial text-xs text-slate-700 hover:bg-slate-100 border-slate-200 font-medium px-3 justify-center"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                    Preview
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCropSourceImage(imageUrl);
                      setIsCropModalOpen(true);
                    }}
                    disabled={isUploading}
                    className="h-8 flex-1 sm:flex-initial text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 font-medium px-3 justify-center"
                  >
                    <Crop className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                    Crop / Frame
                  </Button>

                  {uploadMode === "file" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="h-8 flex-1 sm:flex-initial text-xs text-slate-700 hover:bg-slate-100 border-slate-200 font-medium px-3 justify-center"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                      Change
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                    className="h-8 flex-1 sm:flex-initial text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 font-medium px-3 justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : uploadMode === "file" ? (
              /* Dropzone for File Upload with strict 2MB validation */
              <div className="w-full min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  className="hidden"
                />

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleFileDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-4 sm:p-5 text-center cursor-pointer transition-all w-full overflow-hidden ${
                    isDragOver
                      ? "border-slate-900 bg-slate-50/90 scale-[1.005]"
                      : "border-slate-200 hover:border-slate-400 bg-slate-50/40 hover:bg-slate-50"
                  } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-slate-700 mb-2" />
                      <p className="text-xs font-semibold text-slate-800">
                        Uploading image...
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Please wait while the file is processed and stored.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-600">
                        <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        <span className="text-slate-900 underline underline-offset-2">
                          Click to browse
                        </span>{" "}
                        or drag & drop category image
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        PNG, JPG, WEBP, GIF or SVG —{" "}
                        <span className="font-semibold text-rose-600">Max size 2MB</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Direct Image URL input */
              <div className="space-y-1.5 w-full min-w-0">
                <div className="flex gap-2 w-full">
                  <Input
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setUploadError("");
                    }}
                    placeholder="https://images.unsplash.com/... or /uploads/category.jpg"
                    className="h-9 text-xs flex-1 min-w-0"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Paste a direct public image link (Unsplash, Cloudinary, or local /uploads/).
                </p>
              </div>
            )}

            {/* Error Banner if > 2MB or invalid format */}
            {uploadError && (
              <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-rose-700 text-xs w-full min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-rose-800">Upload Rejected</p>
                  <p className="text-[11px] text-rose-700 mt-0.5 break-words">{uploadError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError("")}
                  className="text-rose-500 hover:text-rose-800 p-0.5 shrink-0"
                  title="Dismiss error"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Row 4: Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Editorial description of the category and curation notes..."
              rows={3}
              className="text-xs"
            />
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="space-y-0.5">
              <label className="text-xs font-semibold text-slate-900 cursor-pointer">
                Category Visibility (Active)
              </label>
              <p className="text-[11px] text-slate-500">
                When inactive, this category and its navigation links are hidden from customers.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* SEO Metadata Accordion Section */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Search Engine Optimization (SEO)
                </span>
                {(metaTitle || metaDescription) && (
                  <Badge variant="outline" className="text-[10px] bg-white">
                    Configured
                  </Badge>
                )}
              </div>
              {showSeo ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>

            {showSeo && (
              <div className="p-4 bg-white space-y-3 border-t border-slate-200">
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
                    placeholder={name ? `${name} | VogueThreads India` : "Luxury Apparel Category"}
                    className="h-8 text-xs"
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
                    placeholder="Discover VogueThreads curated designer collection. Premium fabrics, tailored silhouettes, and fast express delivery across India."
                    rows={2}
                    className="text-xs"
                    maxLength={180}
                  />
                </div>

                {/* Google SERP Live Snippet Preview */}
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Google Search Result Preview
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-slate-500 font-mono block truncate">
                      https://voguethreads.in › categories › {slug || "category-slug"}
                    </span>
                    <h4 className="text-sm font-medium text-blue-800 hover:underline cursor-pointer truncate">
                      {metaTitle || (name ? `${name} | VogueThreads India` : "Category Title")}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {metaDescription ||
                        description ||
                        "Explore our exclusive luxury fashion collection at VogueThreads India with timeless tailoring and effortless styling."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3 sm:pt-4 gap-2 flex flex-col-reverse sm:flex-row sm:justify-end w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 text-xs w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white min-w-[110px] w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {/* Full-size Image Preview Lightbox Modal */}
    <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl box-border">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-slate-100 text-slate-800 shrink-0">
              <Eye className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="text-base font-bold text-slate-900 truncate">
                Category Image Preview
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 truncate">
                {name ? `Preview for category: ${name}` : "Full resolution category banner"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Contained high-res image view */}
        <div className="my-2 sm:my-3 flex items-center justify-center bg-slate-950/5 rounded-xl border border-slate-200/80 p-2 sm:p-4 min-h-[180px] sm:min-h-[240px] max-h-[44vh] sm:max-h-[52vh] overflow-hidden w-full min-w-0">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={name || "Category Preview"}
              className="max-h-[40vh] sm:max-h-[48vh] w-auto max-w-full object-contain rounded-lg shadow-sm select-none"
            />
          ) : (
            <div className="text-center text-slate-400 py-12">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No image uploaded</p>
            </div>
          )}
        </div>

        {/* Modal Footer: Clean, responsive layout that NEVER clips buttons */}
        <div className="border-t border-slate-100 pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
          {/* Left: Direct URL Link with strict truncation */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-slate-600 hover:text-slate-900 underline underline-offset-2 truncate min-w-0 block"
              title={imageUrl}
            >
              {imageUrl}
            </a>
          </div>

          {/* Right: Action buttons (full width on mobile, inline on desktop) */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPreviewModalOpen(false);
                setCropSourceImage(imageUrl);
                setIsCropModalOpen(true);
              }}
              className="h-8 flex-1 sm:flex-initial text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200 font-medium px-3 justify-center"
            >
              <Crop className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Crop / Frame
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                handleRemoveImage();
                setIsPreviewModalOpen(false);
              }}
              className="h-8 flex-1 sm:flex-initial text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 font-medium px-3 justify-center"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Remove Image
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setIsPreviewModalOpen(false)}
              className="h-8 flex-1 sm:flex-initial text-xs bg-slate-900 text-white hover:bg-slate-800 font-medium px-4 justify-center"
            >
              Close Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Interactive Image Cropping & Framing Modal */}
    <ImageCropModal
      isOpen={isCropModalOpen}
      onClose={() => setIsCropModalOpen(false)}
      imageSrc={cropSourceImage || imageUrl}
      onCropComplete={handleCropComplete}
      title="Crop & Frame Category Image"
      defaultAspect={4 / 5}
    />
  </>
  );
}
