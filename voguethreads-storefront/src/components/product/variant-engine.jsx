"use client";

import React, { useState, useEffect } from "react";
import { Check, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function VariantEngine({
  variants = [],
  onVariantChange,
  onColorChange,
  initialVariantId = null,
}) {
  if (!variants || variants.length === 0) return null;

  // Extract unique colors
  const colorMap = new Map();
  variants.forEach((v) => {
    if (v.color?.name && !colorMap.has(v.color.name)) {
      colorMap.set(v.color.name, v.color);
    }
  });
  const availableColors = Array.from(colorMap.values());

  // Default color & size
  const defaultVariant =
    variants.find((v) => v.variantId === initialVariantId) ||
    variants.find((v) => v.cachedStock?.available > 0) ||
    variants[0];

  const [selectedColor, setSelectedColor] = useState(
    defaultVariant?.color?.name || availableColors[0]?.name || ""
  );
  const [selectedSize, setSelectedSize] = useState(defaultVariant?.size || "");

  // Available sizes for the currently selected color
  const variantsForColor = variants.filter(
    (v) => v.color?.name === selectedColor
  );

  // All unique sizes in the product catalog for consistent matrix display
  const allSizes = [...new Set(variants.map((v) => v.size))];

  // Active matching variant
  const currentVariant =
    variants.find(
      (v) => v.color?.name === selectedColor && v.size === selectedSize
    ) ||
    variantsForColor[0] ||
    variants[0];

  // Notify parent on mount and when variant changes
  useEffect(() => {
    if (currentVariant && onVariantChange) {
      onVariantChange(currentVariant);
    }
  }, [currentVariant?.sku]);

  const handleSelectColor = (colorName) => {
    setSelectedColor(colorName);
    if (onColorChange) {
      onColorChange(colorName);
    }
    // Check if the current size is available in the new color; if not, pick the first in-stock size
    const availableInNewColor = variants.filter((v) => v.color?.name === colorName);
    const hasSameSize = availableInNewColor.find((v) => v.size === selectedSize);
    if (!hasSameSize && availableInNewColor.length > 0) {
      const firstInStock = availableInNewColor.find((v) => v.cachedStock?.available > 0) || availableInNewColor[0];
      setSelectedSize(firstInStock.size);
    }
  };

  const handleSelectSize = (size) => {
    setSelectedSize(size);
  };

  const availableStock = currentVariant?.cachedStock?.available ?? 0;
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= 5;

  return (
    <div className="space-y-6">
      {/* Color Selector */}
      {availableColors.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Color: <span className="font-normal text-text-muted">{selectedColor}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {availableColors.map((color, idx) => {
              const isSelected = selectedColor === color.name;
              const isWhiteOrLight = color.hex === "#FFFFFF" || color.hex === "#FAFAFA" || color.hex === "#F3F1EC";
              return (
                <button
                  key={`${color.name}-${idx}`}
                  type="button"
                  title={color.name}
                  onClick={() => handleSelectColor(color.name)}
                  className={`group relative flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200 ${
                    isSelected
                      ? "ring-2 ring-brand-primary ring-offset-2 scale-110 border-transparent shadow-sm"
                      : "border-border/80 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color.hex }}
                >
                  {isSelected && (
                    <Check
                      className={`w-4 h-4 ${isWhiteOrLight ? "text-black" : "text-white"}`}
                    />
                  )}
                  {/* Tooltip */}
                  <span className="absolute -top-8 scale-0 group-hover:scale-100 transition-transform bg-black text-white text-[10px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap shadow-md">
                    {color.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size Selector */}
      {allSizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
              Size: <span className="font-normal text-text-muted">{selectedSize}</span>
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {allSizes.map((size) => {
              const variantOption = variantsForColor.find((v) => v.size === size);
              const exists = Boolean(variantOption);
              const stock = variantOption?.cachedStock?.available ?? 0;
              const isSelected = selectedSize === size;
              const disabled = !exists || stock <= 0;

              return (
                <button
                  key={size}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectSize(size)}
                  className={`relative py-2.5 px-3 rounded-xl text-xs font-semibold tracking-wider transition-all duration-150 flex flex-col items-center justify-center border ${
                    isSelected
                      ? "bg-brand-primary text-white border-brand-primary shadow-md shadow-brand-primary/20 scale-[1.02]"
                      : disabled
                      ? "bg-[#F5F4F0] text-[#8E8E93]/60 border-[#EDEDF0] cursor-not-allowed line-through"
                      : "bg-white text-[#141414] border-[#E5E2DC] hover:border-[#141414] hover:bg-[#F9F9FA]"
                  }`}
                >
                  <span>{size}</span>
                  {exists && stock > 0 && stock <= 3 && (
                    <span className="text-[9px] font-normal text-amber-600 mt-0.5">
                      {stock} left
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Real-time Stock Indicator */}
      <div className="pt-2">
        {isOutOfStock ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>Currently out of stock in this size</span>
          </div>
        ) : isLowStock ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span>Hurry, only {availableStock} left in stock!</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse" />
            <span>In stock and ready to ship</span>
          </div>
        )}
      </div>
    </div>
  );
}
