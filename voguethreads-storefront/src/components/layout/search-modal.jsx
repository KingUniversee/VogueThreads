"use client";

import React, { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Search, X, TrendingUp, Clock, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { StorefrontImage } from "@/components/ui/storefront-image";

export function SearchModal({ open, onOpenChange }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [suggestions, setSuggestions] = useState({ products: [], categories: [], popular: [] });
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimerRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vt_recent_searches");
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch {
      // Ignore
    }
  }, [open]);

  // Debounced search suggestions query
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions({ products: [], categories: [], popular: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Search suggestion error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Handle submit search
  const handleSearch = (searchTerm) => {
    const term = (searchTerm || query).trim();
    if (!term) return;

    // Save to recent searches
    try {
      const updated = [term, ...recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("vt_recent_searches", JSON.stringify(updated));
    } catch {
      // Ignore
    }

    onOpenChange(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("vt_recent_searches");
    } catch {
      // Ignore
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            "fixed top-[8%] sm:top-[12%] left-1/2 z-50 -translate-x-1/2 w-full max-w-2xl px-4",
            "focus:outline-none animate-slide-down"
          )}
        >
          <div className="w-full bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#E5E2DC] overflow-hidden">
            {/* Search Input Bar */}
            <div className="relative flex items-center px-6 py-4 border-b border-[#EDEDF0]">
              <Search className="w-5 h-5 text-[#141414] mr-3 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search heavyweight tees, hoodies, trousers, linens..."
                className="w-full bg-transparent text-base text-[#141414] placeholder:text-[#8E8E93] focus:outline-none font-normal"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-1 rounded-full text-[#8E8E93] hover:text-[#141414] hover:bg-[#F3F2EE] mr-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-full text-[#5A5A5E] hover:text-[#141414] hover:bg-[#F3F2EE] transition-colors"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </DialogPrimitive.Close>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Live Search Suggestions (When typing) */}
              {query.trim() && (
                <div className="space-y-4">
                  {/* Matching Categories */}
                  {suggestions.categories?.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] block mb-2">
                        Categories
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {suggestions.categories.map((cat) => (
                          <Link
                            key={cat.slug}
                            href={`/category/${cat.slug}`}
                            onClick={() => onOpenChange(false)}
                            className="px-3 py-1.5 rounded-xl bg-[#F5F4F0] border border-[#E5E2DC] text-xs font-semibold text-[#141414] hover:bg-[#141414] hover:text-white hover:border-[#141414] transition-all"
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Products */}
                  {suggestions.products?.length > 0 ? (
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] block mb-2">
                        Matching Pieces
                      </span>
                      <div className="divide-y divide-[#EDEDF0]">
                        {suggestions.products.map((p) => (
                          <Link
                            key={p.slug}
                            href={`/product/${p.slug}`}
                            onClick={() => onOpenChange(false)}
                            className="flex items-center gap-3 py-2.5 px-3 rounded-2xl hover:bg-[#F8F7F4] transition-colors group"
                          >
                            <div className="relative w-11 h-14 rounded-xl overflow-hidden bg-[#F5F4F0] shrink-0 border border-[#E5E2DC]">
                              <StorefrontImage
                                src={p.image}
                                alt={p.title}
                                fill
                                className="object-cover object-center"
                                sizes="44px"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-medium text-[#141414] group-hover:text-black truncate transition-colors">
                                {p.title}
                              </h4>
                              <span className="text-xs font-bold text-[#5A5A5E]">
                                {formatPrice(p.price)}
                              </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-[#8E8E93] group-hover:text-[#141414] group-hover:translate-x-1 transition-all" />
                          </Link>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSearch()}
                        className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold text-center text-white bg-[#141414] hover:bg-[#262626] transition-colors shadow-xs"
                      >
                        View all results for &ldquo;{query}&rdquo;
                      </button>
                    </div>
                  ) : !isLoading ? (
                    <div className="text-center py-6 text-xs text-[#8E8E93]">
                      No direct matches found. Press Enter to view full catalog search.
                    </div>
                  ) : null}
                </div>
              )}

              {/* Popular Searches (Default view) */}
              {!query.trim() && (
                <div>
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-[#141414]">
                    <TrendingUp className="w-3.5 h-3.5 text-[#141414]" />
                    <span>Popular Inquiries</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["Heavyweight Boxy Tee", "French Terry Hoodie", "Wide-Leg Trousers", "Linen Shirt", "Overcoat", "Leather Loafers"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleSearch(item)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#F5F4F0] hover:bg-[#141414] hover:text-white hover:border-[#141414] transition-all text-[#141414] border border-[#E5E2DC] shadow-2xs"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Searches */}
              {!query.trim() && recentSearches.length > 0 && (
                <div className="pt-3 border-t border-[#EDEDF0]">
                  <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-[#8E8E93]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Recent Searches</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-[10px] text-[#8E8E93] hover:text-[#141414] tracking-normal uppercase font-semibold transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleSearch(item)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm text-[#141414] hover:bg-[#F8F7F4] transition-colors text-left"
                      >
                        <span className="flex items-center gap-2.5">
                          <Clock className="w-3.5 h-3.5 text-[#8E8E93]" />
                          {item}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#8E8E93]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Hint */}
            <div className="px-6 py-3 bg-[#FBFBF9] border-t border-[#EDEDF0] flex items-center justify-between text-[11px] text-[#8E8E93]">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E5E2DC] text-[#141414] font-mono text-[10px] shadow-2xs">ESC</kbd> to close</span>
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E5E2DC] text-[#141414] font-mono text-[10px] shadow-2xs">ENTER</kbd> to search</span>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
