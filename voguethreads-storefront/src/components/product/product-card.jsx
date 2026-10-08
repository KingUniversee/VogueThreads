"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Star, Eye, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

export function ProductCard({ product, onQuickView, priority = false }) {
  if (!product) return null;

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check wishlist state from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
      setIsWishlisted(saved.some((item) => item.slug === product.slug));
    } catch {
      // ignore
    }
  }, [product.slug]);

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const saved = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
      let updated;
      if (isWishlisted) {
        updated = saved.filter((item) => item.slug !== product.slug);
        setIsWishlisted(false);
        toast.info("Removed from wishlist", { description: product.title });
      } else {
        updated = [...saved, {
          _id: product._id,
          title: product.title,
          slug: product.slug,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          primaryImage: product.primaryImage,
          brand: product.brand,
          addedAt: Date.now(),
        }];
        setIsWishlisted(true);
        toast.success("Added to wishlist", { description: product.title });
      }
      localStorage.setItem("vt_wishlist", JSON.stringify(updated));
      window.dispatchEvent(new Event("vt_wishlist_updated"));
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  const hasDiscount = product.discountPercent > 0;
  const isOutOfStock = product.isOutOfStock;
  const isLowStock = product.isLowStock;

  return (
    <div
      className="group relative flex flex-col rounded-[2rem] p-3 sm:p-3.5 transition-all duration-300 liquid-glass-card cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.30) 50%, rgba(255, 255, 255, 0.50) 100%)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1.5px solid rgba(255, 255, 255, 0.85)",
        boxShadow: "inset 0 1px 2px 0 #ffffff, 0 14px 36px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Inset Image Container with Badges & Action Overlay */}
      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-black/[0.04] shadow-xs">
        <Link href={`/product/${product.slug}`} className="block w-full h-full">
          {/* Primary Image */}
          <StorefrontImage
            src={product.primaryImage}
            alt={product.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover object-center transition-all duration-700 ease-out ${
              product.hoverImage && isHovered
                ? "opacity-0 scale-105"
                : "opacity-100 scale-100"
            }`}
          />

          {/* Hover Secondary Image (if exists) */}
          {product.hoverImage && (
            <StorefrontImage
              src={product.hoverImage}
              alt={`${product.title} Alternate`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-cover object-center absolute inset-0 transition-all duration-700 ease-out ${
                isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"
              }`}
            />
          )}
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="flex flex-wrap gap-1.5">
            {hasDiscount && (
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-[#141414] text-white shadow-xs">
                -{product.discountPercent}%
              </span>
            )}
            {isOutOfStock ? (
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/90 backdrop-blur-md text-red-600 border border-red-200 shadow-xs">
                Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-white/90 backdrop-blur-md text-amber-800 border border-amber-200 shadow-xs">
                Only {product.totalStock} left
              </span>
            ) : null}
          </div>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`pointer-events-auto p-2 rounded-2xl transition-all duration-200 shadow-sm backdrop-blur-md border ${
              isWishlisted
                ? "bg-red-500 text-white border-red-500 shadow-red-500/30"
                : "bg-white/60 border-white/70 text-text-muted hover:text-red-500 hover:bg-white/90"
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-75 ${
                isWishlisted ? "fill-white" : ""
              }`}
            />
          </button>
        </div>

        {/* Quick View Button (desktop hover reveal) */}
        {onQuickView && (
          <div className="absolute inset-x-3 bottom-3 z-10 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hidden sm:block">
            <Button
              type="button"
              variant="glassDark"
              size="sm"
              onClick={handleQuickView}
              className="w-full shadow-lg backdrop-blur-md font-medium text-xs tracking-wider uppercase rounded-xl"
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              Quick View
            </Button>
          </div>
        )}
      </div>

      {/* Product Details - Seamlessly integrated directly on the frosted glass surface */}
      <div className="flex flex-col flex-1 px-1.5 pt-3 pb-0.5">
        {/* Brand & Rating Header */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-bold tracking-wider text-[#8E8E93] uppercase line-clamp-1">
            {product.brand}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-amber-500 font-medium shrink-0">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[#141414] font-semibold">{product.rating}</span>
            <span className="text-[#8E8E93] font-normal">({product.reviewCount})</span>
          </div>
        </div>

        {/* Title */}
        <Link
          href={`/product/${product.slug}`}
          className="text-sm sm:text-base font-semibold text-[#141414] group-hover:text-black line-clamp-1 transition-colors mb-2.5"
        >
          {product.title}
        </Link>

        {/* Price Row */}
        <div className="mt-auto pt-2.5 flex items-baseline gap-2 border-t border-black/[0.06]">
          <span className="text-base sm:text-lg font-black text-[#141414] tracking-tight">
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice && (
            <span className="text-xs sm:text-sm text-[#8E8E93] line-through font-normal">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
