"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Sparkles,
  Check,
  X,
  Layers,
  ArrowDown,
  RefreshCw,
  IndianRupee,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatINR } from "@/lib/formatters";

export const PRESET_COLORS = [
  { name: "Jet Black", hex: "#000000", code: "BLK" },
  { name: "Pure White", hex: "#FFFFFF", code: "WHT" },
  { name: "Navy Blue", hex: "#0F172A", code: "NVY" },
  { name: "Olive Green", hex: "#556B2F", code: "OLV" },
  { name: "Heather Grey", hex: "#94A3B8", code: "GRY" },
  { name: "Sand Beige", hex: "#D2B48C", code: "SND" },
  { name: "Crimson Red", hex: "#DC2626", code: "RED" },
  { name: "Burgundy", hex: "#831843", code: "BUR" },
  { name: "Forest Green", hex: "#14532D", code: "FST" },
  { name: "Royal Blue", hex: "#1D4ED8", code: "BLU" },
];

export const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];

function VariantMatrixComponent({
  productTitle = "",
  basePrice = 0,
  compareAtPrice = 0,
  costPrice = 0,
  variants = [],
  onChange,
}) {
  // 1. Dynamic Matrix State: selected colors & sizes
  const [colors, setColors] = useState(() => {
    if (variants.length > 0) {
      const colorMap = new Map();
      variants.forEach((v) => {
        if (v.color?.name && !colorMap.has(v.color.name)) {
          colorMap.set(v.color.name, {
            name: v.color.name,
            hex: v.color.hex || "#000000",
            code: v.color.code || v.color.name.slice(0, 3).toUpperCase(),
          });
        }
      });
      return Array.from(colorMap.values());
    }
    return [PRESET_COLORS[0], PRESET_COLORS[1]]; // Jet Black, Pure White by default
  });

  const [sizes, setSizes] = useState(() => {
    if (variants.length > 0) {
      const sizeSet = new Set();
      variants.forEach((v) => {
        if (v.size) sizeSet.add(v.size);
      });
      return Array.from(sizeSet);
    }
    return ["S", "M", "L", "XL"];
  });

  // Custom Color input state
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#4F46E5");
  const [customColorCode, setCustomColorCode] = useState("");

  // Custom Size input state
  const [customSizeName, setCustomSizeName] = useState("");

  // Bulk operation inputs
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCompareAt, setBulkCompareAt] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("VT-APP");

  // Enabled combination keys: set of `${colorName}:::${size}`
  const [enabledKeys, setEnabledKeys] = useState(() => {
    const set = new Set();
    variants.forEach((v) => {
      if (v.color?.name && v.size) {
        set.add(`${v.color.name}:::${v.size}`);
      }
    });
    return set;
  });

  // Variant details map keyed by `${colorName}:::${size}`
  const [variantDetails, setVariantDetails] = useState(() => {
    const map = {};
    variants.forEach((v) => {
      const key = `${v.color?.name}:::${v.size}`;
      map[key] = {
        variantId: v.variantId,
        sku: v.sku,
        barcode: v.barcode || "",
        price: v.price !== undefined ? v.price : basePrice,
        compareAtPrice: v.compareAtPrice !== undefined ? v.compareAtPrice : compareAtPrice,
        costPrice: v.costPrice !== undefined ? v.costPrice : costPrice,
        weightGrams: v.weightGrams || 300,
        availability: v.availability || "IN_STOCK",
        isActive: v.isActive !== undefined ? v.isActive : true,
        inventory: v.inventory || { available: 0, reserved: 0 },
      };
    });
    return map;
  });

  // Generate clean SKU helper
  const generateSku = (colorObj, sizeStr) => {
    const cleanPrefix = (skuPrefix || "VT-APP")
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
    const colorCode = (colorObj.code || colorObj.name.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const sizeCode = sizeStr.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return `${cleanPrefix}-${colorCode}-${sizeCode}`;
  };

  // Sync to parent onChange whenever enabled variants or variant details change
  useEffect(() => {
    const compiledVariants = [];
    colors.forEach((color) => {
      sizes.forEach((size) => {
        const key = `${color.name}:::${size}`;
        if (enabledKeys.has(key)) {
          const safeColorKey = (color.code || color.name).toLowerCase().replace(/[^a-z0-9]/g, "_");
          const safeSizeKey = size.toLowerCase().replace(/[^a-z0-9]/g, "_");
          compiledVariants.push({
            variantId: details.variantId || `var_${safeColorKey}_${safeSizeKey}`,
            sku: details.sku || generateSku(color, size),
            barcode: details.barcode || "",
            color: {
              name: color.name,
              hex: color.hex,
              code: color.code,
            },
            size,
            price: details.price !== undefined && details.price !== "" ? Number(details.price) : Number(basePrice) || 0,
            compareAtPrice: details.compareAtPrice ? Number(details.compareAtPrice) : undefined,
            costPrice: details.costPrice ? Number(details.costPrice) : undefined,
            weightGrams: details.weightGrams || 300,
            availability: details.availability || "IN_STOCK",
            isActive: details.isActive !== undefined ? details.isActive : true,
            inventory: details.inventory,
          });
        }
      });
    });

    onChange(compiledVariants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledKeys, variantDetails, colors, sizes, basePrice]);

  // Toggle single matrix combination
  const toggleCombination = (color, size) => {
    const key = `${color.name}:::${size}`;
    const nextKeys = new Set(enabledKeys);
    if (nextKeys.has(key)) {
      nextKeys.delete(key);
    } else {
      nextKeys.add(key);
      if (!variantDetails[key]) {
        setVariantDetails((prev) => ({
          ...prev,
          [key]: {
            sku: generateSku(color, size),
            price: basePrice || 0,
            compareAtPrice: compareAtPrice || 0,
            costPrice: costPrice || 0,
            weightGrams: 300,
            availability: "IN_STOCK",
            isActive: true,
          },
        }));
      }
    }
    setEnabledKeys(nextKeys);
  };

  // Toggle entire color row
  const toggleColorRow = (color) => {
    const rowKeys = sizes.map((s) => `${color.name}:::${s}`);
    const allEnabled = rowKeys.every((k) => enabledKeys.has(k));
    const nextKeys = new Set(enabledKeys);

    if (allEnabled) {
      rowKeys.forEach((k) => nextKeys.delete(k));
    } else {
      rowKeys.forEach((k) => {
        nextKeys.add(k);
        const s = k.split(":::")[1];
        if (!variantDetails[k]) {
          setVariantDetails((prev) => ({
            ...prev,
            [k]: {
              sku: generateSku(color, s),
              price: basePrice || 0,
              compareAtPrice: compareAtPrice || 0,
              costPrice: costPrice || 0,
              weightGrams: 300,
              availability: "IN_STOCK",
              isActive: true,
            },
          }));
        }
      });
    }
    setEnabledKeys(nextKeys);
  };

  // Toggle entire size column
  const toggleSizeColumn = (size) => {
    const colKeys = colors.map((c) => `${c.name}:::${size}`);
    const allEnabled = colKeys.every((k) => enabledKeys.has(k));
    const nextKeys = new Set(enabledKeys);

    if (allEnabled) {
      colKeys.forEach((k) => nextKeys.delete(k));
    } else {
      colKeys.forEach((k) => {
        nextKeys.add(k);
        const colorName = k.split(":::")[0];
        const colorObj = colors.find((c) => c.name === colorName) || { name: colorName };
        if (!variantDetails[k]) {
          setVariantDetails((prev) => ({
            ...prev,
            [k]: {
              sku: generateSku(colorObj, size),
              price: basePrice || 0,
              compareAtPrice: compareAtPrice || 0,
              costPrice: costPrice || 0,
              weightGrams: 300,
              availability: "IN_STOCK",
              isActive: true,
            },
          }));
        }
      });
    }
    setEnabledKeys(nextKeys);
  };

  // Enable all combinations
  const enableAll = () => {
    const nextKeys = new Set();
    const nextDetails = { ...variantDetails };

    colors.forEach((color) => {
      sizes.forEach((size) => {
        const key = `${color.name}:::${size}`;
        nextKeys.add(key);
        if (!nextDetails[key]) {
          nextDetails[key] = {
            sku: generateSku(color, size),
            price: basePrice || 0,
            compareAtPrice: compareAtPrice || 0,
            costPrice: costPrice || 0,
            weightGrams: 300,
            availability: "IN_STOCK",
            isActive: true,
          };
        }
      });
    });

    setVariantDetails(nextDetails);
    setEnabledKeys(nextKeys);
  };

  // Disable all combinations
  const disableAll = () => {
    setEnabledKeys(new Set());
  };

  // Add custom color
  const handleAddCustomColor = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!customColorName.trim()) return;
    if (colors.some((c) => c.name.toLowerCase() === customColorName.trim().toLowerCase())) return;

    const code =
      customColorCode.trim().toUpperCase() ||
      customColorName.trim().slice(0, 3).toUpperCase();

    const newColor = {
      name: customColorName.trim(),
      hex: customColorHex,
      code,
    };

    setColors([...colors, newColor]);
    setCustomColorName("");
    setCustomColorCode("");
  };

  // Remove color
  const handleRemoveColor = (colorName) => {
    setColors(colors.filter((c) => c.name !== colorName));
    const nextKeys = new Set(enabledKeys);
    sizes.forEach((s) => nextKeys.delete(`${colorName}:::${s}`));
    setEnabledKeys(nextKeys);
  };

  // Add custom size
  const handleAddCustomSize = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!customSizeName.trim()) return;
    const cleanSize = customSizeName.trim().toUpperCase();
    if (sizes.includes(cleanSize)) return;

    setSizes([...sizes, cleanSize]);
    setCustomSizeName("");
  };

  // Remove size
  const handleRemoveSize = (sizeStr) => {
    setSizes(sizes.filter((s) => s !== sizeStr));
    const nextKeys = new Set(enabledKeys);
    colors.forEach((c) => nextKeys.delete(`${c.name}:::${sizeStr}`));
    setEnabledKeys(nextKeys);
  };

  // Bulk apply price
  const handleApplyBulkPrice = () => {
    if (!bulkPrice || isNaN(bulkPrice)) return;
    const numPrice = Number(bulkPrice);
    setVariantDetails((prev) => {
      const next = { ...prev };
      enabledKeys.forEach((key) => {
        next[key] = { ...(next[key] || {}), price: numPrice };
      });
      return next;
    });
    setBulkPrice("");
  };

  // Bulk apply Compare Price
  const handleApplyBulkCompareAt = () => {
    if (!bulkCompareAt || isNaN(bulkCompareAt)) return;
    const numPrice = Number(bulkCompareAt);
    setVariantDetails((prev) => {
      const next = { ...prev };
      enabledKeys.forEach((key) => {
        next[key] = { ...(next[key] || {}), compareAtPrice: numPrice };
      });
      return next;
    });
    setBulkCompareAt("");
  };

  // Bulk regenerate SKUs
  const handleRegenerateSkus = () => {
    setVariantDetails((prev) => {
      const next = { ...prev };
      colors.forEach((color) => {
        sizes.forEach((size) => {
          const key = `${color.name}:::${size}`;
          if (enabledKeys.has(key)) {
            next[key] = {
              ...(next[key] || {}),
              sku: generateSku(color, size),
            };
          }
        });
      });
      return next;
    });
  };

  // Check duplicate SKUs in enabled list
  const skuDuplicates = useMemo(() => {
    const counts = {};
    enabledKeys.forEach((key) => {
      const sku = variantDetails[key]?.sku?.trim().toUpperCase();
      if (sku) {
        counts[sku] = (counts[sku] || 0) + 1;
      }
    });
    const dupes = new Set();
    Object.keys(counts).forEach((sku) => {
      if (counts[sku] > 1) dupes.add(sku);
    });
    return dupes;
  }, [enabledKeys, variantDetails]);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. PALETTE & SIZING SELECTION                                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50 p-4 sm:p-5 rounded-lg border border-slate-200">
        {/* Colors Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Apparel Colors ({colors.length})
            </span>
            <span className="text-[11px] text-slate-400">Add or remove swatches</span>
          </div>

          {/* Active Colors Chips */}
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <div
                key={c.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs shadow-subtle group"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-[10px] font-mono text-slate-400 uppercase">[{c.code || "COL"}]</span>
                <button
                  type="button"
                  onClick={() => handleRemoveColor(c.name)}
                  className="ml-1 text-slate-300 hover:text-rose-600 transition-colors"
                  title="Remove color"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Quick Presets Picker */}
          <div className="space-y-1.5 pt-2">
            <p className="text-[11px] text-slate-500 font-medium">Quick Preset Palette:</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((pc) => {
                const isSelected = colors.some((c) => c.name === pc.name);
                return (
                  <button
                    key={pc.name}
                    type="button"
                    disabled={isSelected}
                    onClick={() => setColors([...colors, pc])}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      isSelected
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: pc.hex }}
                    />
                    <span>{pc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Color Container (Non-form container to prevent nested form HTML violation) */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="color"
              value={customColorHex}
              onChange={(e) => setCustomColorHex(e.target.value)}
              className="h-8 w-8 rounded border border-slate-200 cursor-pointer p-0 bg-transparent"
              title="Pick color hex"
            />
            <Input
              placeholder="Color name (e.g. Lavender)"
              value={customColorName}
              onChange={(e) => setCustomColorName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomColor(e);
                }
              }}
              className="h-8 text-xs flex-1"
            />
            <Input
              placeholder="Code (LAV)"
              value={customColorCode}
              onChange={(e) => setCustomColorCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomColor(e);
                }
              }}
              className="h-8 text-xs w-20 uppercase font-mono"
              maxLength={4}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddCustomColor}
              className="h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
        </div>

        {/* Sizes Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Garment Sizes ({sizes.length})
            </span>
            <span className="text-[11px] text-slate-400">Alpha or numeric scales</span>
          </div>

          {/* Active Sizes Chips */}
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <div
                key={s}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-mono font-bold shadow-subtle text-slate-800"
              >
                <span>{s}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSize(s)}
                  className="ml-1 text-slate-300 hover:text-rose-600 transition-colors"
                  title="Remove size"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Preset Size Groups */}
          <div className="space-y-1.5 pt-2">
            <p className="text-[11px] text-slate-500 font-medium">Standard Apparel Presets:</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SIZES.map((sz) => {
                const isSelected = sizes.includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={isSelected}
                    onClick={() => setSizes([...sizes, sz])}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                      isSelected
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add Custom Size Container (Non-form container to prevent nested form HTML violation) */}
          <div className="flex items-center gap-2 pt-2">
            <Input
              placeholder="Custom size (e.g. 4XL or 32 Waist)"
              value={customSizeName}
              onChange={(e) => setCustomSizeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomSize(e);
                }
              }}
              className="h-8 text-xs flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddCustomSize}
              className="h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Size
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COLOR × SIZE INTERACTIVE MATRIX GRID                                   */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Color × Size Variant Matrix</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Click individual cells or header buttons to activate combinations. Only checked combinations will be created.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {enabledKeys.size} / {colors.length * sizes.length} enabled
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enableAll}
              className="h-7 text-xs"
            >
              Enable All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={disableAll}
              className="h-7 text-xs text-slate-500 hover:text-rose-600"
            >
              Disable All
            </Button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-subtle">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="text-left p-3 font-semibold text-slate-700 min-w-[150px]">
                  Color \ Size
                </th>
                {sizes.map((size) => (
                  <th key={size} className="p-3 text-center min-w-[70px]">
                    <button
                      type="button"
                      onClick={() => toggleSizeColumn(size)}
                      className="font-mono font-bold text-slate-800 hover:text-indigo-600 transition-colors inline-flex items-center gap-1 group"
                      title={`Toggle all ${size}`}
                    >
                      <span>{size}</span>
                      <ArrowDown className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {colors.map((color) => (
                <tr key={color.name} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-medium text-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full border border-slate-300 shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span>{color.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleColorRow(color)}
                        className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors font-semibold"
                      >
                        All
                      </button>
                    </div>
                  </td>

                  {sizes.map((size) => {
                    const key = `${color.name}:::${size}`;
                    const isChecked = enabledKeys.has(key);
                    return (
                      <td key={size} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCombination(color, size)}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer accent-slate-900"
                          aria-label={`Toggle ${color.name} / ${size}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BULK MODIFIERS (SKU, Price, Availability)                              */}
      {/* ========================================================================= */}
      {enabledKeys.size > 0 && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-indigo-600" />
              <span>Bulk Modifiers for Enabled Variants ({enabledKeys.size})</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Bulk SKU Generator */}
            <div className="flex items-center gap-1.5">
              <Input
                placeholder="SKU Prefix (e.g. VT-SHIRT)"
                value={skuPrefix}
                onChange={(e) => setSkuPrefix(e.target.value)}
                className="h-8 text-xs font-mono uppercase"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRegenerateSkus}
                className="h-8 text-xs whitespace-nowrap"
                title="Generate standard SKUs (Prefix-Color-Size)"
              >
                <Sparkles className="h-3 w-3 mr-1" /> Gen SKUs
              </Button>
            </div>

            {/* Bulk Selling Price */}
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="Set Price (₹)"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleApplyBulkPrice}
                className="h-8 text-xs whitespace-nowrap"
              >
                Apply Price
              </Button>
            </div>

            {/* Bulk Compare Price */}
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="Set Compare Price (₹)"
                value={bulkCompareAt}
                onChange={(e) => setBulkCompareAt(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleApplyBulkCompareAt}
                className="h-8 text-xs whitespace-nowrap"
              >
                Apply MRP
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. GRANULAR VARIANT LIST (SKU, Pricing, Barcode, Status)                  */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Active Variant Specifications ({enabledKeys.size})
          </h4>
          {skuDuplicates.size > 0 && (
            <div className="flex items-center gap-1.5 text-rose-600 text-xs font-medium bg-rose-50 px-2 py-1 rounded border border-rose-200">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Duplicate SKUs detected: {Array.from(skuDuplicates).join(", ")}</span>
            </div>
          )}
        </div>

        {enabledKeys.size === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs">
            No variants enabled yet. Select combinations in the matrix above.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-subtle">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-left">
                  <th className="p-3">Color & Size</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Price (₹)</th>
                  <th className="p-3">Compare At (₹)</th>
                  <th className="p-3">Barcode</th>
                  <th className="p-3 text-center">Stock (Warehouse)</th>
                  <th className="p-3 text-center">Active</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from(enabledKeys).map((key) => {
                  const [colorName, size] = key.split(":::");
                  const color = colors.find((c) => c.name === colorName) || { name: colorName, hex: "#000" };
                  const details = variantDetails[key] || {};
                  const isDupe = skuDuplicates.has(details.sku?.trim().toUpperCase());

                  return (
                    <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                      {/* Color & Size */}
                      <td className="p-3 font-medium text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                          <span className="font-mono text-slate-400">/</span>
                          <Badge variant="outline" className="font-mono font-bold text-[10px]">
                            {size}
                          </Badge>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="p-3">
                        <Input
                          value={details.sku || ""}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setVariantDetails((prev) => ({
                              ...prev,
                              [key]: { ...(prev[key] || {}), sku: val },
                            }));
                          }}
                          className={`h-8 w-44 text-xs font-mono font-semibold uppercase ${
                            isDupe ? "border-rose-500 bg-rose-50 text-rose-900" : ""
                          }`}
                          placeholder="SKU"
                        />
                      </td>

                      {/* Selling Price */}
                      <td className="p-3">
                        <Input
                          type="number"
                          value={details.price !== undefined ? details.price : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariantDetails((prev) => ({
                              ...prev,
                              [key]: { ...(prev[key] || {}), price: val },
                            }));
                          }}
                          className="h-8 w-24 text-xs font-mono"
                          placeholder="Price"
                        />
                      </td>

                      {/* Compare Price */}
                      <td className="p-3">
                        <Input
                          type="number"
                          value={details.compareAtPrice !== undefined ? details.compareAtPrice : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariantDetails((prev) => ({
                              ...prev,
                              [key]: { ...(prev[key] || {}), compareAtPrice: val },
                            }));
                          }}
                          className="h-8 w-24 text-xs font-mono"
                          placeholder="MRP"
                        />
                      </td>

                      {/* Barcode */}
                      <td className="p-3">
                        <Input
                          value={details.barcode || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVariantDetails((prev) => ({
                              ...prev,
                              [key]: { ...(prev[key] || {}), barcode: val },
                            }));
                          }}
                          className="h-8 w-32 text-xs font-mono"
                          placeholder="EAN / UPC"
                        />
                      </td>

                      {/* Warehouse Inventory indicator (Source of Truth: Inventory module) */}
                      <td className="p-3 text-center">
                        <span className="font-mono text-slate-700 font-semibold text-xs">
                          {details.inventory?.available || 0} avail
                        </span>
                      </td>

                      {/* Active Toggle */}
                      <td className="p-3 text-center">
                        <Switch
                          checked={details.isActive !== false}
                          onCheckedChange={(checked) => {
                            setVariantDetails((prev) => ({
                              ...prev,
                              [key]: { ...(prev[key] || {}), isActive: checked },
                            }));
                          }}
                        />
                      </td>

                      {/* Remove Button */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            const nextKeys = new Set(enabledKeys);
                            nextKeys.delete(key);
                            setEnabledKeys(nextKeys);
                          }}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Disable this variant"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export const VariantMatrix = React.memo(VariantMatrixComponent);
