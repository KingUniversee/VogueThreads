"use client";

import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Search, Package, Check, RefreshCw, Layers } from "lucide-react";

export function ProductPickerDialog({
  isOpen,
  onClose,
  onSelectProducts,
  alreadySelectedIds = [],
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tempSelected, setTempSelected] = useState(new Set());

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load categories for filter
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      fetch("/api/categories")
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setCategories(json.data || []);
        })
        .catch(() => {});
    }
  }, [isOpen, categories.length]);

  // Reset selected set when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTempSelected(new Set());
    }
  }, [isOpen]);

  // Fetch products from server
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "20");
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (selectedCategory) params.set("category", selectedCategory);

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success) {
          setProducts(json.data || []);
        }
      })
      .catch((err) => {
        console.warn("Failed to load products for picker:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, debouncedSearch, selectedCategory]);

  const toggleSelect = (product) => {
    setTempSelected((prev) => {
      const next = new Set(prev);
      const key = String(product._id);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const selectedObjects = products.filter((p) => tempSelected.has(String(p._id)));
    onSelectProducts(selectedObjects);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 bg-white">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Select Products for Collection
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Search apparel catalog and select products to include in this merchandising collection.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or SKU..."
              className="pl-8 h-8 text-xs bg-slate-50"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Product List Container */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 min-h-[260px] max-h-[380px] bg-white">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-xs">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Package className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No products found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Try searching with another keyword or category filter.
              </p>
            </div>
          ) : (
            products.map((p) => {
              const pId = String(p._id);
              const isAlreadyAdded = alreadySelectedIds.includes(pId);
              const isSelected = tempSelected.has(pId);
              const primaryImg =
                p.primaryImages?.[0]?.url || p.variants?.[0]?.images?.[0]?.url || "";
              const price = p.variants?.[0]?.price ? `₹${p.variants[0].price}` : "—";

              return (
                <div
                  key={p._id}
                  onClick={() => !isAlreadyAdded && toggleSelect(p)}
                  className={`flex items-center justify-between p-2.5 transition-colors ${
                    isAlreadyAdded
                      ? "bg-slate-50/70 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "bg-indigo-50/50 cursor-pointer"
                      : "hover:bg-slate-50 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected || isAlreadyAdded}
                      disabled={isAlreadyAdded}
                      onChange={() => !isAlreadyAdded && toggleSelect(p)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />

                    <div className="h-9 w-9 rounded-md border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {primaryImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={primaryImg} alt={p.title} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {p.title}
                        </span>
                        {isAlreadyAdded && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 bg-slate-200 text-slate-600">
                            Already in Collection
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{p.variants?.[0]?.sku || "No SKU"}</span>
                        <span>•</span>
                        <span>{p.categoryId?.name || "Uncategorized"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right pl-3">
                    <span className="text-xs font-mono font-bold text-slate-900">{price}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {tempSelected.size} product{tempSelected.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={tempSelected.size === 0}
              className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              Add Selected ({tempSelected.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
