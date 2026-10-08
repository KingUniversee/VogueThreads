"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, Check, Star, ShoppingBag, ArrowRight } from "lucide-react";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

export function QuickViewModal({ product, isOpen, onClose }) {
  if (!isOpen || !product) return null;

  const [selectedColor, setSelectedColor] = useState(product.colors?.[0]?.name || "");
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const handleAddToCart = () => {
    setIsAdding(true);
    setTimeout(() => {
      try {
        const cart = JSON.parse(localStorage.getItem("vt_cart") || "[]");
        const existingIndex = cart.findIndex(
          (item) => item.slug === product.slug && item.color === selectedColor && item.size === selectedSize
        );
        if (existingIndex > -1) {
          cart[existingIndex].quantity += quantity;
        } else {
          cart.push({
            productId: product._id,
            title: product.title,
            slug: product.slug,
            price: product.price,
            image: product.primaryImage,
            color: selectedColor,
            size: selectedSize,
            quantity,
            addedAt: Date.now(),
          });
        }
        localStorage.setItem("vt_cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("vt_cart_updated"));
        toast.success("Added to Cart", {
          description: `${product.title} (${selectedColor} / ${selectedSize}) x ${quantity}`,
        });
        setIsAdding(false);
        onClose();
      } catch (err) {
        console.error(err);
        setIsAdding(false);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-surface rounded-3xl shadow-2xl border border-border/80 overflow-hidden z-10 flex flex-col md:flex-row max-h-[90vh]">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-surface/80 hover:bg-surface text-text-muted hover:text-text-primary shadow-sm backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image Column */}
        <div className="relative md:w-1/2 aspect-[3/4] md:aspect-auto bg-neutral-100 shrink-0">
          <StorefrontImage
            src={product.primaryImage}
            alt={product.title}
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {product.discountPercent > 0 && (
            <div className="absolute top-4 left-4">
              <Badge variant="accent" size="sm" className="font-semibold shadow-sm">
                -{product.discountPercent}% OFF
              </Badge>
            </div>
          )}
        </div>

        {/* Product Info Column */}
        <div className="flex-1 p-6 sm:p-8 overflow-y-auto flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                {product.brand}
              </span>
              <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating}</span>
                <span className="text-text-muted">({product.reviewCount} reviews)</span>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight mb-2">
              {product.title}
            </h2>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl font-black text-text-primary">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-base text-text-muted line-through font-normal">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-text-muted leading-relaxed mb-6">
              {product.shortDescription || "Crafted with architectural precision and high-grade materials for effortless elegance."}
            </p>

            {/* Color Selector */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-2">
                  Color: <span className="font-normal text-text-muted">{selectedColor}</span>
                </label>
                <div className="flex items-center gap-2">
                  {product.colors.map((c, idx) => (
                    <button
                      key={`${c.name}-${idx}`}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={`relative w-7 h-7 rounded-full border transition-all ${
                        selectedColor === c.name
                          ? "ring-2 ring-brand-primary ring-offset-2 scale-105 border-transparent"
                          : "border-border/80 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {selectedColor === c.name && (
                        <Check className={`w-3.5 h-3.5 mx-auto ${c.hex === "#FFFFFF" || c.hex === "#FAFAFA" ? "text-black" : "text-white"}`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-primary mb-2">
                  Size: <span className="font-normal text-text-muted">{selectedSize}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                        selectedSize === s
                          ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                          : "bg-surface text-text-primary border-border hover:border-text-primary"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions & Deep Link */}
          <div className="pt-4 border-t border-border/60 flex flex-col gap-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleAddToCart}
              isLoading={isAdding}
              disabled={product.isOutOfStock}
              className="w-full"
              leftIcon={<ShoppingBag className="w-4 h-4" />}
            >
              {product.isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
            <Link
              href={`/product/${product.slug}`}
              onClick={onClose}
              className="text-xs text-center font-medium text-text-muted hover:text-brand-primary flex items-center justify-center gap-1.5 transition-colors py-1"
            >
              <span>View full product specifications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
