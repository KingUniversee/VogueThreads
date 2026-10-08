"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  SlidersHorizontal,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Palette,
  CheckSquare,
  ListFilter,
  FileText,
  Hash,
  ToggleLeft,
  X,
  Eye,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const ATTRIBUTE_TYPES = [
  {
    type: "SELECT",
    title: "Select (Single Choice)",
    description: "Dropdown where products select exactly one option (e.g. Fit: Slim, Regular, Oversized).",
    icon: ListFilter,
    hasOptions: true,
  },
  {
    type: "MULTISELECT",
    title: "Multi Select (Multiple Choices)",
    description: "Checkbox list where products can have multiple values (e.g. Occasion: Casual, Party).",
    icon: CheckSquare,
    hasOptions: true,
  },
  {
    type: "COLOR",
    title: "Color Swatch & Hex",
    description: "Color palette with visual swatches and hex codes (e.g. Navy Blue #000080, Maroon #800000).",
    icon: Palette,
    hasOptions: true,
  },
  {
    type: "TEXT",
    title: "Free Text",
    description: "Open text field for custom descriptions or notes (e.g. Care Instructions, Country of Origin).",
    icon: FileText,
    hasOptions: false,
  },
  {
    type: "NUMBER",
    title: "Numeric Value",
    description: "Numerical specification for garment measurements (e.g. GSM, Length in inches).",
    icon: Hash,
    hasOptions: false,
  },
  {
    type: "BOOLEAN",
    title: "Boolean (Yes / No)",
    description: "Toggle flag for binary features (e.g. Organic Cotton: Yes/No, Stretchable: Yes/No).",
    icon: ToggleLeft,
    hasOptions: false,
  },
];

export function AttributeForm({ initialAttribute = null, isEditMode = false }) {
  const router = useRouter();

  // Basic Information
  const [name, setName] = useState(initialAttribute?.name || "");
  const [code, setCode] = useState(initialAttribute?.code || "");
  const [isManualCode, setIsManualCode] = useState(Boolean(initialAttribute?.code));
  const [description, setDescription] = useState(initialAttribute?.description || "");
  const [type, setType] = useState(initialAttribute?.type || "SELECT");

  // Configuration Flags
  const [isRequired, setIsRequired] = useState(Boolean(initialAttribute?.isRequired));
  const [isFilterable, setIsFilterable] = useState(
    initialAttribute?.isFilterable !== undefined ? initialAttribute.isFilterable : true
  );
  const [isActive, setIsActive] = useState(
    initialAttribute?.isActive !== undefined ? initialAttribute.isActive : true
  );
  const [sortOrder, setSortOrder] = useState(initialAttribute?.sortOrder || 0);

  // Options State (for SELECT, MULTISELECT, COLOR)
  const [options, setOptions] = useState(
    (initialAttribute?.options || []).map((opt, idx) => ({
      _id: opt._id || `temp-${idx}`,
      label: opt.label || "",
      value: opt.value || "",
      hex: opt.hex || "",
      sortOrder: opt.sortOrder !== undefined ? opt.sortOrder : idx,
      isActive: opt.isActive !== undefined ? opt.isActive : true,
    }))
  );

  // Inline "Add Option" draft state
  const [draftLabel, setDraftLabel] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [draftHex, setDraftHex] = useState("#0f172a");
  const [isManualDraftValue, setIsManualDraftValue] = useState(false);
  const [optionError, setOptionError] = useState("");

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Helper to slugify code
  const slugify = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Auto-generate code when name changes (unless manual override)
  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!isManualCode) {
      setCode(slugify(val));
    }
  };

  const handleCodeChange = (e) => {
    setIsManualCode(true);
    setCode(slugify(e.target.value));
  };

  const handleResetCode = () => {
    setIsManualCode(false);
    setCode(slugify(name));
  };

  // Draft option label auto-slugify
  const handleDraftLabelChange = (e) => {
    const val = e.target.value;
    setDraftLabel(val);
    if (!isManualDraftValue) {
      setDraftValue(slugify(val));
    }
  };

  const handleDraftValueChange = (e) => {
    setIsManualDraftValue(true);
    setDraftValue(slugify(e.target.value));
  };

  // Add Option to Table
  const handleAddOption = () => {
    setOptionError("");
    const trimmedLabel = draftLabel.trim();
    const cleanValue = slugify(draftValue || draftLabel);

    if (!trimmedLabel) {
      setOptionError("Option label is required.");
      return;
    }
    if (!cleanValue) {
      setOptionError("Option value/key is required.");
      return;
    }

    // Duplicate checks
    const duplicateLabel = options.some(
      (opt) => opt.label.toLowerCase() === trimmedLabel.toLowerCase()
    );
    if (duplicateLabel) {
      setOptionError(`An option with label "${trimmedLabel}" already exists.`);
      return;
    }

    const duplicateValue = options.some((opt) => opt.value === cleanValue);
    if (duplicateValue) {
      setOptionError(`An option with key "${cleanValue}" already exists.`);
      return;
    }

    const newOption = {
      _id: `temp-${Date.now()}`,
      label: trimmedLabel,
      value: cleanValue,
      hex: type === "COLOR" ? draftHex : "",
      sortOrder: options.length,
      isActive: true,
    };

    setOptions([...options, newOption]);
    setDraftLabel("");
    setDraftValue("");
    setIsManualDraftValue(false);
    setDraftHex("#0f172a");
  };

  // Remove Option
  const handleRemoveOption = (indexToRemove) => {
    setOptions(options.filter((_, idx) => idx !== indexToRemove));
  };

  // Move Option Up
  const handleMoveOptionUp = (index) => {
    if (index === 0) return;
    const updated = [...options];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setOptions(updated.map((opt, i) => ({ ...opt, sortOrder: i })));
  };

  // Move Option Down
  const handleMoveOptionDown = (index) => {
    if (index === options.length - 1) return;
    const updated = [...options];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setOptions(updated.map((opt, i) => ({ ...opt, sortOrder: i })));
  };

  // Toggle Option Active
  const handleToggleOptionActive = (index) => {
    const updated = [...options];
    updated[index].isActive = !updated[index].isActive;
    setOptions(updated);
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("Attribute name is required.");
      return;
    }

    const finalCode = slugify(code || name);
    if (!finalCode) {
      setErrorMessage("A valid key/code is required.");
      return;
    }

    const isOptionBased = ["SELECT", "MULTISELECT", "COLOR"].includes(type);
    if (isOptionBased && options.length === 0) {
      setErrorMessage(`Please add at least one option/value for the ${type} attribute.`);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      code: finalCode,
      type,
      description: description.trim(),
      options: isOptionBased
        ? options.map((opt, i) => ({
            label: opt.label.trim(),
            value: opt.value.trim(),
            hex: opt.hex ? opt.hex.trim() : "",
            sortOrder: i,
            isActive: Boolean(opt.isActive),
          }))
        : [],
      isRequired: Boolean(isRequired),
      isFilterable: Boolean(isFilterable),
      isActive: Boolean(isActive),
      sortOrder: Number(sortOrder) || 0,
    };

    try {
      const url = isEditMode ? `/api/attributes/${initialAttribute._id}` : "/api/attributes";
      const method = isEditMode ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save attribute");
      }

      setSuccessMessage(
        isEditMode
          ? `Attribute "${json.data.name}" updated successfully.`
          : `Attribute "${json.data.name}" registered successfully.`
      );

      setTimeout(() => {
        router.push("/attributes");
        router.refresh();
      }, 700);
    } catch (err) {
      setErrorMessage(err.message || "An unexpected error occurred while saving the attribute.");
      setIsSubmitting(false);
    }
  };

  const selectedTypeConfig = ATTRIBUTE_TYPES.find((t) => t.type === type) || ATTRIBUTE_TYPES[0];
  const requiresOptions = selectedTypeConfig.hasOptions;

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
              <Link href="/attributes">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Attributes
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
            {isEditMode ? `Edit Attribute: ${initialAttribute?.name || name}` : "Register New Attribute"}
          </h1>
          <p className="text-xs text-slate-500">
            {isEditMode
              ? "Update apparel taxonomy, allowed option values, and storefront filtering behavior."
              : "Define reusable garment specifications to enrich product details and catalog filters."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs border-slate-200">
            <Link href="/attributes">Cancel</Link>
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            size="sm"
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
              "Create Attribute"
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
        {/* 1. BASIC IDENTITY */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  1. Attribute Identity
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Core identification label and technical slug key.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Attribute Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Fabric, Fit, Pattern, Sleeve, Occasion"
                  className="h-9 text-xs"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Display name shown in product forms, specification tables, and storefront filters.
                </p>
              </div>

              {/* Code / Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Slug / Key Code <span className="text-rose-500">*</span>
                  </label>
                  {isManualCode && (
                    <button
                      type="button"
                      onClick={handleResetCode}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Reset to Auto
                    </button>
                  )}
                </div>
                <Input
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="fabric"
                  className="h-9 text-xs font-mono"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Unique lowercase identifier used in API queries, variants, and catalog filters.
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Description / Guidance
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what this specification means and how merchandisers should apply it..."
                rows={2}
                className="text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* 2. ATTRIBUTE TYPE & BEHAVIOR */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  2. Attribute Type &amp; Storefront Behavior
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Select how values are entered and whether this attribute acts as a faceted search filter.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-1">
            {/* Type Cards Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ATTRIBUTE_TYPES.map((t) => {
                const isSelected = type === t.type;
                const Icon = t.icon;

                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => {
                      setType(t.type);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-slate-900 bg-slate-900/5 ring-1 ring-slate-900"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">{t.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{t.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Behavior Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              {/* Is Filterable */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Storefront Filter</span>
                  <span className="text-[10px] text-slate-500 block">
                    Show as faceted filter on catalog pages
                  </span>
                </div>
                <Switch checked={isFilterable} onCheckedChange={setIsFilterable} />
              </div>

              {/* Is Required */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Mandatory Field</span>
                  <span className="text-[10px] text-slate-500 block">
                    Require when creating new products
                  </span>
                </div>
                <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              </div>

              {/* Display Order */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Display Order</span>
                  <span className="text-[10px] text-slate-500 block">
                    Ordering sequence in filters
                  </span>
                </div>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  className="w-16 h-8 text-xs font-mono text-right"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. VALUE & OPTION MANAGEMENT (FOR SELECT, MULTISELECT, COLOR) */}
        {requiresOptions ? (
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                    <ListFilter className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      3. Allowed Values &amp; Options ({options.length})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Define choices available in product creation dropdowns and storefront filters.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-mono">
                  {options.length} {options.length === 1 ? "Option" : "Options"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              {/* Option Error */}
              {optionError && (
                <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  <span>{optionError}</span>
                  <button
                    type="button"
                    onClick={() => setOptionError("")}
                    className="text-rose-500 hover:text-rose-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Options Table */}
              {options.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                  <Info className="h-6 w-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">No options configured yet</p>
                  <p className="text-[11px] text-slate-400">
                    Use the form below to add predefined choices (e.g. Cotton, Linen, Slim, Oversized).
                  </p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                        <th className="py-2.5 px-3 w-16 text-center">Order</th>
                        <th className="py-2.5 px-3">Option Label</th>
                        <th className="py-2.5 px-3">Key / Value</th>
                        {type === "COLOR" && <th className="py-2.5 px-3">Swatch &amp; Hex</th>}
                        <th className="py-2.5 px-3 text-center">Active</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {options.map((opt, idx) => (
                        <tr key={opt._id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Reorder buttons */}
                          <td className="py-2 px-3 text-center">
                            <div className="inline-flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveOptionUp(idx)}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                                title="Move up"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === options.length - 1}
                                onClick={() => handleMoveOptionDown(idx)}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-100"
                                title="Move down"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </button>
                            </div>
                          </td>

                          {/* Label */}
                          <td className="py-2 px-3 font-semibold text-slate-800">{opt.label}</td>

                          {/* Key */}
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                            {opt.value}
                          </td>

                          {/* Color Swatch */}
                          {type === "COLOR" && (
                            <td className="py-2 px-3">
                              <div className="inline-flex items-center gap-2">
                                <span
                                  className="h-4 w-4 rounded-full border border-slate-300 shadow-2xs"
                                  style={{ backgroundColor: opt.hex || "#000000" }}
                                />
                                <span className="font-mono text-[11px] text-slate-700">
                                  {opt.hex || "#000000"}
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Active Switch */}
                          <td className="py-2 px-3 text-center">
                            <Switch
                              checked={opt.isActive}
                              onCheckedChange={() => handleToggleOptionActive(idx)}
                              className="scale-75"
                            />
                          </td>

                          {/* Delete Option */}
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                              title="Delete option"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add New Option Row (Div container - NOT a nested form) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                  + Add Option Value
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Label */}
                  <div className={type === "COLOR" ? "sm:col-span-4" : "sm:col-span-5"}>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Option Label <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={draftLabel}
                      onChange={handleDraftLabelChange}
                      placeholder={
                        type === "COLOR"
                          ? "e.g. Midnight Navy"
                          : name
                          ? `e.g. ${name} Option`
                          : "e.g. Slim Fit"
                      }
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  {/* Key / Value */}
                  <div className={type === "COLOR" ? "sm:col-span-4" : "sm:col-span-5"}>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Option Key <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={draftValue}
                      onChange={handleDraftValueChange}
                      placeholder="e.g. midnight-navy"
                      className="h-8 text-xs font-mono bg-white"
                    />
                  </div>

                  {/* Color Picker (for COLOR type) */}
                  {type === "COLOR" && (
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Color Swatch
                      </label>
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded px-2 h-8">
                        <input
                          type="color"
                          value={draftHex}
                          onChange={(e) => setDraftHex(e.target.value)}
                          className="h-5 w-5 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span className="text-[10px] font-mono text-slate-700 truncate">
                          {draftHex}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddOption}
                      className="w-full h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Value
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Notice for Free Input Types */
          <Card className="bg-white border-slate-200 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                3. Input Specifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
                <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-slate-900 block">
                    No predefined options required for {selectedTypeConfig.title}
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    When editing products, merchandisers will enter direct {type.toLowerCase()} values
                    (e.g.{" "}
                    {type === "TEXT"
                      ? "open text description"
                      : type === "NUMBER"
                      ? "numeric values"
                      : "toggle Yes/No"}
                    ) rather than picking from a predefined choices list.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. VISIBILITY & STATUS */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  4. Registry Status
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Enable or disable this attribute across the catalog.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Active Attribute</span>
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
                  Active attributes are rendered in the product editor and storefront filters.
                  Inactive attributes are preserved for existing products but hidden from new
                  assignments.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>

        {/* BOTTOM ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="outline" size="sm" asChild className="h-9 text-xs border-slate-200">
            <Link href="/attributes">Cancel</Link>
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
              "Create Attribute"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
