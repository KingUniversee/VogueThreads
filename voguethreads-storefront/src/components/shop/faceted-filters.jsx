"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, X, Check, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export function FacetedFilters({ facets, totalProducts = 0 }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Active query states
  const activeCategory = searchParams.get("category") || "";
  const activeBrand = searchParams.get("brand") || "";
  const activeGender = searchParams.get("gender") || "";
  const activeSize = searchParams.get("size") || "";
  const activeMinPrice = searchParams.get("minPrice") || "";
  const activeMaxPrice = searchParams.get("maxPrice") || "";
  const activeInStock = searchParams.get("inStock") === "true";
  const activeOnSale = searchParams.get("onSale") === "true";

  // Section collapse states
  const [openSections, setOpenSections] = useState({
    categories: true,
    brands: true,
    genders: true,
    sizes: true,
    price: true,
  });

  const toggleSection = (sec) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === undefined || value === "" || value === false) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    params.delete("page"); // Reset page on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    router.push(pathname);
  };

  // Count active filters
  const activeCount = [
    activeCategory,
    activeBrand,
    activeGender,
    activeSize,
    activeMinPrice,
    activeMaxPrice,
    activeInStock,
    activeOnSale,
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Active Filter Pills */}
      {activeCount > 0 && (
        <div className="p-4 rounded-2xl bg-[#F8F7F4] border border-[#E5E2DC] space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#141414]">
              Active Filters ({activeCount})
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] font-semibold text-[#8E8E93] hover:text-[#141414] hover:underline flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {activeCategory && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E5E2DC] text-xs font-medium text-[#141414] shadow-xs">
                <span>Category: {activeCategory}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => updateParam("category", "")} />
              </span>
            )}
            {activeBrand && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E5E2DC] text-xs font-medium text-[#141414] shadow-xs">
                <span>Brand: {activeBrand}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => updateParam("brand", "")} />
              </span>
            )}
            {activeGender && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E5E2DC] text-xs font-medium text-[#141414] shadow-xs">
                <span>Gender: {activeGender}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => updateParam("gender", "")} />
              </span>
            )}
            {activeSize && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E5E2DC] text-xs font-medium text-[#141414] shadow-xs">
                <span>Size: {activeSize}</span>
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => updateParam("size", "")} />
              </span>
            )}
            {(activeMinPrice || activeMaxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E5E2DC] text-xs font-medium text-[#141414] shadow-xs">
                <span>Price: ₹{activeMinPrice || "0"} - ₹{activeMaxPrice || "10k+"}</span>
                <X
                  className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors"
                  onClick={() => {
                    updateParam("minPrice", "");
                    updateParam("maxPrice", "");
                  }}
                />
              </span>
            )}
            {activeInStock && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E5E2DC] text-xs font-medium text-[#141414] shadow-xs">
                <span>In Stock Only</span>
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => updateParam("inStock", "")} />
              </span>
            )}
            {activeOnSale && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E5E2DC] text-xs font-medium text-[#141414] shadow-xs">
                <span>On Sale Only</span>
                <X className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors" onClick={() => updateParam("onSale", "")} />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Categories Accordion */}
      {facets?.categories && facets.categories.length > 0 && (
        <div className="border-b border-[#EDEDF0] pb-5">
          <button
            type="button"
            onClick={() => toggleSection("categories")}
            className="flex items-center justify-between w-full text-left font-bold text-xs uppercase tracking-wider text-[#141414] mb-3"
          >
            <span>Category</span>
            {openSections.categories ? <ChevronUp className="w-4 h-4 text-[#8E8E93]" /> : <ChevronDown className="w-4 h-4 text-[#8E8E93]" />}
          </button>
          {openSections.categories && (
            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => updateParam("category", "")}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs transition-colors ${
                  !activeCategory
                    ? "bg-[#141414] text-white font-semibold shadow-xs"
                    : "text-[#5A5A5E] hover:text-[#141414] hover:bg-[#F3F2EE]"
                }`}
              >
                <span>All Categories</span>
                <span className={`text-[10px] ${!activeCategory ? "text-white/70" : "text-[#8E8E93]"}`}>{totalProducts}</span>
              </button>
              {facets.categories.map((cat) => {
                const isSelected = activeCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => updateParam("category", isSelected ? "" : cat.slug)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? "bg-[#141414] text-white font-semibold shadow-xs"
                        : "text-[#5A5A5E] hover:text-[#141414] hover:bg-[#F3F2EE]"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`text-[10px] ${isSelected ? "text-white/70" : "text-[#8E8E93]"}`}>({cat.count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Brand Accordion */}
      {facets?.brands && facets.brands.length > 0 && (
        <div className="border-b border-[#EDEDF0] pb-5">
          <button
            type="button"
            onClick={() => toggleSection("brands")}
            className="flex items-center justify-between w-full text-left font-bold text-xs uppercase tracking-wider text-[#141414] mb-3"
          >
            <span>Brand</span>
            {openSections.brands ? <ChevronUp className="w-4 h-4 text-[#8E8E93]" /> : <ChevronDown className="w-4 h-4 text-[#8E8E93]" />}
          </button>
          {openSections.brands && (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {facets.brands.map((b) => {
                const isSelected = activeBrand === b.slug;
                return (
                  <button
                    key={b.slug}
                    type="button"
                    onClick={() => updateParam("brand", isSelected ? "" : b.slug)}
                    className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs transition-colors ${
                      isSelected
                        ? "bg-[#141414] text-white font-semibold shadow-xs"
                        : "text-[#5A5A5E] hover:text-[#141414] hover:bg-[#F3F2EE]"
                    }`}
                  >
                    <span>{b.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Gender Accordion */}
      <div className="border-b border-[#EDEDF0] pb-5">
        <button
          type="button"
          onClick={() => toggleSection("genders")}
          className="flex items-center justify-between w-full text-left font-bold text-xs uppercase tracking-wider text-[#141414] mb-3"
        >
          <span>Gender</span>
          {openSections.genders ? <ChevronUp className="w-4 h-4 text-[#8E8E93]" /> : <ChevronDown className="w-4 h-4 text-[#8E8E93]" />}
        </button>
        {openSections.genders && (
          <div className="flex flex-wrap gap-2">
            {["MEN", "WOMEN", "UNISEX"].map((g) => {
              const isSelected = activeGender === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateParam("gender", isSelected ? "" : g)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-[#141414] text-white border-[#141414] shadow-xs"
                      : "bg-white text-[#5A5A5E] border-[#E5E2DC] hover:border-[#141414] hover:text-[#141414]"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Size Chips Accordion */}
      {facets?.sizes && facets.sizes.length > 0 && (
        <div className="border-b border-[#EDEDF0] pb-5">
          <button
            type="button"
            onClick={() => toggleSection("sizes")}
            className="flex items-center justify-between w-full text-left font-bold text-xs uppercase tracking-wider text-[#141414] mb-3"
          >
            <span>Size</span>
            {openSections.sizes ? <ChevronUp className="w-4 h-4 text-[#8E8E93]" /> : <ChevronDown className="w-4 h-4 text-[#8E8E93]" />}
          </button>
          {openSections.sizes && (
            <div className="grid grid-cols-4 gap-1.5">
              {facets.sizes.map((s) => {
                const isSelected = activeSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateParam("size", isSelected ? "" : s)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                      isSelected
                        ? "bg-[#141414] text-white border-[#141414] shadow-xs"
                        : "bg-white text-[#5A5A5E] border-[#E5E2DC] hover:border-[#141414] hover:text-[#141414]"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Price Range Accordion */}
      <div className="border-b border-[#EDEDF0] pb-5">
        <button
          type="button"
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full text-left font-bold text-xs uppercase tracking-wider text-[#141414] mb-3"
        >
          <span>Price Range</span>
          {openSections.price ? <ChevronUp className="w-4 h-4 text-[#8E8E93]" /> : <ChevronDown className="w-4 h-4 text-[#8E8E93]" />}
        </button>
        {openSections.price && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min ₹"
                value={activeMinPrice}
                onChange={(e) => updateParam("minPrice", e.target.value)}
                className="w-1/2 px-3 py-1.5 rounded-xl border border-[#E5E2DC] bg-white text-xs text-[#141414] placeholder:text-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-[#141414] focus:border-[#141414]"
              />
              <span className="text-[#8E8E93]">-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={activeMaxPrice}
                onChange={(e) => updateParam("maxPrice", e.target.value)}
                className="w-1/2 px-3 py-1.5 rounded-xl border border-[#E5E2DC] bg-white text-xs text-[#141414] placeholder:text-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-[#141414] focus:border-[#141414]"
              />
            </div>
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Under ₹2,000", max: 2000 },
                { label: "₹2,000 - ₹5,000", min: 2000, max: 5000 },
                { label: "Above ₹5,000", min: 5000 },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    updateParam("minPrice", preset.min || "");
                    updateParam("maxPrice", preset.max || "");
                  }}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-[#F3F2EE] border border-[#E5E2DC] text-[#141414] hover:bg-[#141414] hover:text-white hover:border-[#141414] transition-all font-medium"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stock & Sale Toggles */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#141414]">
          <input
            type="checkbox"
            checked={activeInStock}
            onChange={(e) => updateParam("inStock", e.target.checked ? "true" : "")}
            className="w-4 h-4 rounded border-[#E5E2DC] accent-[#141414] focus:ring-[#141414]"
          />
          <span>In Stock Items Only</span>
        </label>
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#141414]">
          <input
            type="checkbox"
            checked={activeOnSale}
            onChange={(e) => updateParam("onSale", e.target.checked ? "true" : "")}
            className="w-4 h-4 rounded border-[#E5E2DC] accent-[#141414] focus:ring-[#141414]"
          />
          <span>Promotions & On Sale Only</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-28 p-6 rounded-3xl bg-white border border-[#E5E2DC] shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#EDEDF0] mb-5">
            <h3 className="font-bold text-sm tracking-tight text-[#141414] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#141414]" />
              <span>Filters</span>
            </h3>
            {activeCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#141414] text-white">
                {activeCount}
              </span>
            )}
          </div>
          <FilterContent />
        </div>
      </aside>

      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          leftIcon={<Filter className="w-4 h-4" />}
          className="rounded-xl shadow-xs"
        >
          <span>Filters {activeCount > 0 && `(${activeCount})`}</span>
        </Button>

        {/* Mobile Drawer */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileOpen(false)}
            />
            <div className="relative w-full max-w-xs bg-white h-full shadow-2xl z-10 flex flex-col p-6 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[#EDEDF0] mb-5">
                <h3 className="font-bold text-base text-[#141414] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#141414]" />
                  <span>Refine Catalog</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-2 rounded-xl bg-white hover:bg-[#F3F2EE] text-[#5A5A5E] hover:text-[#141414] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1">
                <FilterContent />
              </div>

              <div className="pt-4 border-t border-[#EDEDF0] mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={clearAllFilters}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Show Results
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
