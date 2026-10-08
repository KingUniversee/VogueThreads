"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadWishlist = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
      setItems(saved);
    } catch {
      setItems([]);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadWishlist();
    window.addEventListener("vt_wishlist_updated", loadWishlist);
    return () => window.removeEventListener("vt_wishlist_updated", loadWishlist);
  }, []);

  const handleRemove = (slug, title) => {
    const updated = items.filter((item) => item.slug !== slug);
    setItems(updated);
    localStorage.setItem("vt_wishlist", JSON.stringify(updated));
    window.dispatchEvent(new Event("vt_wishlist_updated"));
    toast.info("Removed from wishlist", { description: title });
  };

  const handleMoveToCart = (item) => {
    try {
      const cart = JSON.parse(localStorage.getItem("vt_cart") || "[]");
      cart.push({
        productId: item._id,
        title: item.title,
        slug: item.slug,
        price: item.price,
        image: item.primaryImage,
        color: "Standard",
        size: "M",
        quantity: 1,
        addedAt: Date.now(),
      });
      localStorage.setItem("vt_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("vt_cart_updated"));

      // Remove from wishlist
      handleRemove(item.slug, item.title);
      toast.success("Moved to cart", { description: item.title });
    } catch (err) {
      console.error(err);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full pb-20 pt-8 sm:pt-12 bg-background">
      <Container>
        {/* Header */}
        <div className="pb-8 border-b border-border/60 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-primary mb-2">
              <Heart className="w-4 h-4 fill-brand-primary" />
              <span>Saved Archive</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
              My Wishlist
            </h1>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            {items.length} {items.length === 1 ? "saved piece" : "saved pieces"}
          </span>
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <div
                key={item.slug}
                className="group relative flex flex-col bg-surface border border-border/70 rounded-3xl overflow-hidden shadow-xs hover:border-brand-primary/40 hover:shadow-xl transition-all duration-300"
              >
                {/* Image Stage */}
                <div className="relative aspect-[3/4] w-full bg-neutral-100 overflow-hidden">
                  <Link href={`/product/${item.slug}`} className="block w-full h-full">
                    <StorefrontImage
                      src={item.primaryImage || "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800"}
                      alt={item.title}
                      fill
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </Link>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item.slug, item.title)}
                    aria-label="Remove item"
                    className="absolute top-3 right-3 p-2 rounded-xl bg-surface/85 hover:bg-surface text-text-muted hover:text-red-500 shadow-sm backdrop-blur-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="p-5 flex flex-col flex-1 justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                      {item.brand || "VogueThreads"}
                    </span>
                    <Link
                      href={`/product/${item.slug}`}
                      className="text-sm font-semibold text-text-primary hover:text-brand-primary line-clamp-2 transition-colors mb-2"
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-base font-bold text-text-primary">
                        {formatPrice(item.price)}
                      </span>
                      {item.compareAtPrice && (
                        <span className="text-xs text-text-muted line-through">
                          {formatPrice(item.compareAtPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleMoveToCart(item)}
                    leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
                    className="w-full"
                  >
                    Move to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center max-w-md mx-auto">
            <EmptyState
              title="Your wishlist is empty"
              description="Explore our archive and save your favorite architectural pieces for later."
              primaryAction={{
                label: "Discover Catalog",
                href: "/shop",
              }}
            />
          </div>
        )}
      </Container>
    </div>
  );
}
