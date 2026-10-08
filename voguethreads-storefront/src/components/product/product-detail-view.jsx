"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Share2,
  ShoppingBag,
  Zap,
  Truck,
  RotateCcw,
  ShieldCheck,
  Ruler,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Star,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { ProductGallery } from "@/components/product/product-gallery";
import { VariantEngine } from "@/components/product/variant-engine";
import { SizeGuideModal } from "@/components/product/size-guide-modal";
import { ReviewsSection } from "@/components/product/reviews-section";
import { ProductCard } from "@/components/product/product-card";
import { recordRecentlyViewed } from "@/components/product/recently-viewed";
import { toast } from "sonner";

export function ProductDetailView({ product }) {
  const router = useRouter();

  // Active Variant State managed by VariantEngine
  const [activeVariant, setActiveVariant] = useState(
    product.variants?.find((v) => v.cachedStock?.available > 0) || product.variants?.[0] || null
  );
  const [quantity, setQuantity] = useState(1);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [activeTab, setActiveTab] = useState("description"); // "description" | "materials" | "specs"

  // Accordion states
  const [accordionOpen, setAccordionOpen] = useState({
    shipping: true,
    returns: false,
    care: false,
  });

  const toggleAccordion = (key) => {
    setAccordionOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Record Recently Viewed & check wishlist
  useEffect(() => {
    if (product) {
      recordRecentlyViewed(product);
      try {
        const saved = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
        setIsWishlisted(saved.some((item) => item.slug === product.slug));
      } catch {
        // ignore
      }
    }
  }, [product?.slug]);

  // Wishlist Toggle
  const toggleWishlist = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("vt_wishlist") || "[]");
      let updated;
      if (isWishlisted) {
        updated = saved.filter((item) => item.slug !== product.slug);
        setIsWishlisted(false);
        toast.info("Removed from wishlist", { description: product.title });
      } else {
        updated = [
          ...saved,
          {
            _id: product._id,
            title: product.title,
            slug: product.slug,
            price: activeVariant?.price || product.price,
            primaryImage: product.primaryImages?.[0]?.url,
            brand: product.brandId?.name || "VogueThreads",
            addedAt: Date.now(),
          },
        ];
        setIsWishlisted(true);
        toast.success("Added to wishlist", { description: product.title });
      }
      localStorage.setItem("vt_wishlist", JSON.stringify(updated));
      window.dispatchEvent(new Event("vt_wishlist_updated"));
    } catch (err) {
      console.error(err);
    }
  };

  // Share Product Link
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.title} | VogueThreads`,
          text: product.shortDescription,
          url,
        });
      } catch {
        // ignore cancel
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Product Link Copied", { description: "Link copied to clipboard" });
    }
  };

  // Add to Cart
  const handleAddToCart = (redirectCheckout = false) => {
    if (!activeVariant) return;

    setIsAddingToCart(true);
    setTimeout(() => {
      try {
        const cart = JSON.parse(localStorage.getItem("vt_cart") || "[]");
        const existingIndex = cart.findIndex(
          (item) => item.sku === activeVariant.sku
        );

        if (existingIndex > -1) {
          cart[existingIndex].quantity += quantity;
        } else {
          cart.push({
            productId: product._id,
            variantId: activeVariant.variantId,
            sku: activeVariant.sku,
            title: product.title,
            slug: product.slug,
            price: activeVariant.price,
            image: product.primaryImages?.[0]?.url,
            color: activeVariant.color?.name,
            size: activeVariant.size,
            quantity,
            addedAt: Date.now(),
          });
        }

        localStorage.setItem("vt_cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("vt_cart_updated"));
        setIsAddingToCart(false);

        if (redirectCheckout) {
          router.push("/checkout");
        } else {
          toast.success("Added to Cart", {
            description: `${product.title} (${activeVariant.color?.name} / ${activeVariant.size}) x ${quantity}`,
          });
        }
      } catch (err) {
        console.error(err);
        setIsAddingToCart(false);
      }
    }, 300);
  };

  const currentPrice = activeVariant?.price || 0;
  const comparePrice = activeVariant?.compareAtPrice || 0;
  const discountPercent =
    comparePrice > currentPrice
      ? Math.round(((comparePrice - currentPrice) / comparePrice) * 100)
      : 0;

  const maxStock = activeVariant?.cachedStock?.available ?? 0;
  const isOutOfStock = maxStock <= 0;

  // Images for current gallery
  const galleryImages =
    activeVariant?.images?.length > 0
      ? activeVariant.images
      : product.primaryImages || [];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Top Product Section: Gallery + Purchase Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Left: Product Gallery (7 Cols) */}
        <div className="lg:col-span-7">
          <ProductGallery images={galleryImages} title={product.title} />
        </div>

        {/* Right: Product Purchase Matrix (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Brand & Stock Eyebrow */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href={`/brand/${product.brandId?.slug || "voguethreads-atelier"}`}
              className="text-xs font-bold uppercase tracking-widest text-text-muted hover:text-brand-primary transition-colors"
            >
              {product.brandId?.name || "VogueThreads Atelier"}
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.reviewMetrics?.averageRating || 5.0}</span>
              <a
                href="#reviews"
                className="text-text-muted hover:underline font-normal"
              >
                ({product.reviewMetrics?.reviewCount || 0} reviews)
              </a>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight leading-tight">
            {product.title}
          </h1>

          {/* SKU & Barcode note */}
          <div className="flex items-center gap-3 text-[11px] text-text-muted font-mono">
            <span>SKU: {activeVariant?.sku || "VT-STANDARD"}</span>
            {product.hsnCode && <span>HSN: {product.hsnCode}</span>}
          </div>

          {/* Pricing & GST Note */}
          <div className="p-4 rounded-2xl bg-[#F8F7F4] border border-[#E5E2DC]">
            <div className="flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-text-primary">
                {formatPrice(currentPrice)}
              </span>
              {comparePrice > currentPrice && (
                <span className="text-base sm:text-lg text-text-muted line-through">
                  {formatPrice(comparePrice)}
                </span>
              )}
              {discountPercent > 0 && (
                <Badge variant="accent" size="sm" className="font-bold">
                  SAVE {discountPercent}%
                </Badge>
              )}
            </div>
            <span className="text-[11px] text-text-muted mt-1 block">
              Inclusive of all taxes & GST (5%). Free express domestic delivery over ₹999.
            </span>
          </div>

          {/* Short Description */}
          {product.shortDescription && (
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
              {product.shortDescription}
            </p>
          )}

          {/* Variant Engine (Color & Size Selectors) */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Select Configuration
              </span>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size Guide</span>
              </button>
            </div>

            <VariantEngine
              variants={product.variants}
              initialVariantId={activeVariant?.variantId}
              onVariantChange={(variant) => {
                setActiveVariant(variant);
                setQuantity(1); // Reset quantity when variant switches
              }}
            />
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                Quantity
              </label>
              <div className="inline-flex items-center border border-[#E5E2DC] rounded-xl bg-white p-1 shadow-2xs">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="p-2 rounded-lg hover:bg-[#F3F2EE] disabled:opacity-30 transition-colors text-[#141414]"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center text-xs font-bold text-text-primary">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= maxStock}
                  onClick={() => setQuantity((prev) => Math.min(maxStock, prev + 1))}
                  className="p-2 rounded-lg hover:bg-[#F3F2EE] disabled:opacity-30 transition-colors text-[#141414]"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons: Add to Cart, Buy Now, Wishlist, Share */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={isOutOfStock}
                isLoading={isAddingToCart}
                onClick={() => handleAddToCart(false)}
                className="flex-1 py-4 text-sm font-bold uppercase tracking-wider"
                leftIcon={<ShoppingBag className="w-4 h-4" />}
              >
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </Button>

              <button
                type="button"
                onClick={toggleWishlist}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isWishlisted
                    ? "bg-red-500 text-white border-red-500 shadow-md shadow-red-500/20"
                    : "border-border bg-surface text-text-muted hover:text-red-500 hover:border-red-200"
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? "fill-white" : ""}`} />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="p-3.5 rounded-2xl border border-border bg-surface text-text-muted hover:text-text-primary hover:border-text-primary transition-all"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {!isOutOfStock && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => handleAddToCart(true)}
                className="w-full py-4 text-sm font-bold uppercase tracking-wider"
                leftIcon={<Zap className="w-4 h-4" />}
              >
                Buy Now
              </Button>
            )}
          </div>

          {/* Delivery & Assurance Accordion */}
          <div className="pt-4 border-t border-border/60 divide-y divide-border/40">
            {/* Shipping Policy */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion("shipping")}
                className="flex items-center justify-between w-full text-left font-bold text-xs uppercase tracking-wider text-text-primary"
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-primary" />
                  <span>Complimentary Delivery</span>
                </span>
                {accordionOpen.shipping ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {accordionOpen.shipping && (
                <p className="text-xs text-text-muted mt-2 leading-relaxed pl-6">
                  Complimentary express shipping across India on orders above ₹999. Estimated delivery within 3-5 business days with live dispatch tracking via Delhivery.
                </p>
              )}
            </div>

            {/* Returns Policy */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion("returns")}
                className="flex items-center justify-between w-full text-left font-bold text-xs uppercase tracking-wider text-text-primary"
              >
                <span className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-brand-primary" />
                  <span>7-Day Return Guarantee</span>
                </span>
                {accordionOpen.returns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {accordionOpen.returns && (
                <p className="text-xs text-text-muted mt-2 leading-relaxed pl-6">
                  Try it on at home with complete peace of mind. We offer complimentary door-step pickup and instant exchange or full refunds within 7 days of delivery.
                </p>
              )}
            </div>

            {/* Care Note */}
            <div className="py-3">
              <button
                type="button"
                onClick={() => toggleAccordion("care")}
                className="flex items-center justify-between w-full text-left font-bold text-xs uppercase tracking-wider text-text-primary"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-primary" />
                  <span>Guaranteed Authenticity</span>
                </span>
                {accordionOpen.care ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {accordionOpen.care && (
                <p className="text-xs text-text-muted mt-2 leading-relaxed pl-6">
                  Every VogueThreads garment is manufactured in certified ethical ateliers, using 100% genuine GOTS organic cotton and artisanal European textiles.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Tabs: Description / Specifications / Care */}
      <div className="pt-10 border-t border-border/60">
        <div className="flex items-center gap-4 border-b border-border/60 pb-3">
          {[
            { id: "description", label: "Editorial Rationale" },
            { id: "specs", label: "Garment Specifications" },
            { id: "materials", label: "Materials & Care" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors relative ${
                activeTab === tab.id
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <span className="absolute bottom-[-13px] inset-x-0 h-0.5 bg-brand-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="py-8 text-xs sm:text-sm text-text-muted leading-relaxed max-w-3xl">
          {activeTab === "description" && (
            <div className="space-y-4">
              <p>{product.description}</p>
              {product.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {product.tags.map((t) => (
                    <span
                      key={t}
                      className="px-3 py-1 rounded-xl bg-[#F5F4F0] text-xs text-[#141414] font-medium border border-[#E5E2DC]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "specs" && (
            <div className="rounded-2xl border border-[#E5E2DC] overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-[#EDEDF0]">
                  {(product.attributes || []).map((attr, idx) => (
                    <tr key={idx} className="hover:bg-[#F9F9FA] transition-colors">
                      <td className="py-3 px-4 font-semibold text-text-primary w-1/3">
                        {attr.name}
                      </td>
                      <td className="py-3 px-4 text-text-muted">{attr.value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-3 px-4 font-semibold text-text-primary">Gender Profile</td>
                    <td className="py-3 px-4 text-text-muted">{product.gender}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-text-primary">HSN Classification</td>
                    <td className="py-3 px-4 text-text-muted">{product.hsnCode || "6109"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-text-primary">
                Washing & Longevity Protocol
              </h4>
              <ul className="list-disc pl-5 space-y-2">
                {(product.careInstructions || [
                  "Machine wash cold inside out with like colors",
                  "Use mild biodegradable detergent",
                  "Line dry in shade to preserve textile tension",
                  "Do not dry clean or iron directly on printed graphics",
                ]).map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section id="reviews" className="pt-10 border-t border-border/60">
        <h2 className="text-xl sm:text-3xl font-black text-text-primary tracking-tight mb-8">
          Customer Endorsements
        </h2>
        <ReviewsSection
          productId={product._id}
          productTitle={product.title}
          initialReviews={product.reviews}
          metrics={product.reviewMetrics}
        />
      </section>

      {/* Related Products: Complete the Look */}
      {product.relatedProducts?.length > 0 && (
        <section className="pt-10 border-t border-border/60">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-primary block mb-1">
                Complete The Look
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-text-primary tracking-tight">
                Recommended Pairings
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-xs font-semibold text-text-muted hover:text-brand-primary transition-colors"
            >
              Explore Catalog
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {product.relatedProducts.map((related) => (
              <ProductCard key={related.slug} product={related} />
            ))}
          </div>
        </section>
      )}

      {/* Size Guide Modal Dialog */}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        categoryName={product.categoryId?.name || "Tops"}
      />
    </div>
  );
}
