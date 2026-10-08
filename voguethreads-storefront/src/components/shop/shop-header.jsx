"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUpDown } from "lucide-react";

export function ShopHeader({
  title = "Shop Catalog",
  description,
  totalCount = 0,
  currentSort = "featured",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (newSort) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", newSort);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const sortOptions = [
    { value: "featured", label: "Featured" },
    { value: "newest", label: "Newest Arrivals" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "best-selling", label: "Best Selling" },
    { value: "top-rated", label: "Top Rated" },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/60">
      <div>
        <h1 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl">
            {description}
          </p>
        )}
        <span className="text-xs font-semibold text-text-muted mt-2 block">
          Showing <strong className="text-text-primary">{totalCount}</strong> {totalCount === 1 ? "piece" : "pieces"}
        </span>
      </div>

      {/* Sort Select */}
      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <label htmlFor="shop-sort" className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Sort By:</span>
        </label>
        <select
          id="shop-sort"
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-[#E5E2DC] bg-white text-xs font-medium text-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414] shadow-2xs cursor-pointer"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
