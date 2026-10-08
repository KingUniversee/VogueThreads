"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Container } from "@/components/ui/container";

const STORAGE_KEY = "vt_recently_viewed";
const MAX_ITEMS = 8;

export function recordRecentlyViewed(product) {
  if (typeof window === "undefined" || !product?.slug) return;
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const filtered = existing.filter((item) => item.slug !== product.slug);
    const updated = [
      {
        _id: product._id,
        title: product.title,
        slug: product.slug,
        brand: product.brand || product.brandId?.name || "VogueThreads",
        primaryImage: product.primaryImage || product.primaryImages?.[0]?.url,
        hoverImage: product.hoverImage || product.primaryImages?.[1]?.url,
        price: product.price || product.variants?.[0]?.price || 0,
        compareAtPrice: product.compareAtPrice || product.variants?.[0]?.compareAtPrice,
        discountPercent: product.discountPercent || 0,
        colors: product.colors || [],
        sizes: product.sizes || [],
        rating: product.rating || 4.9,
        reviewCount: product.reviewCount || 10,
        viewedAt: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("vt_recently_viewed_updated"));
  } catch (err) {
    console.error("Error storing recently viewed:", err);
  }
}

export function RecentlyViewedTray({ currentSlug = null }) {
  const [items, setItems] = useState([]);

  const loadItems = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const filtered = currentSlug
        ? stored.filter((item) => item.slug !== currentSlug)
        : stored;
      setItems(filtered);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    loadItems();
    window.addEventListener("vt_recently_viewed_updated", loadItems);
    return () => window.removeEventListener("vt_recently_viewed_updated", loadItems);
  }, [currentSlug]);

  if (items.length === 0) return null;

  return (
    <section className="py-12 border-t border-border/60 bg-surface/50">
      <Container>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                Recently Viewed
              </h3>
              <p className="text-xs text-text-muted">
                Pieces you explored during this session
              </p>
            </div>
          </div>

          <Link
            href="/shop"
            className="text-xs font-semibold text-text-muted hover:text-brand-primary flex items-center gap-1.5 transition-colors group"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {items.slice(0, 4).map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
