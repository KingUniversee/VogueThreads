import React from "react";
import Link from "next/link";
import { ArrowRight, Tag, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getProducts } from "@/lib/catalog";

export const metadata = {
  title: "Seasonal Sale & Promotions | VogueThreads",
  description:
    "Explore discounted luxury streetwear, heavyweight tees, fleece hoodies, and designer essentials from VogueThreads.",
};

export default async function SalePage() {
  const { products, total } = await getProducts({
    onSale: true,
    limit: 24,
  });

  return (
    <div className="w-full pb-20 pt-8 sm:pt-12 bg-background">
      <Container>
        {/* Promotional Sale Header */}
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-neutral-900 via-black to-neutral-950 text-white mb-12 border border-neutral-800 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-bold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              <span>LIMITED ARCHIVE SALE</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Promotional Reductions
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Explore curated discounts across select heavyweight blanks, summer linens, and outerwear silhouettes. Prices as marked.
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Showing {products.length} of {total} discounted pieces
              </span>
              <Link
                href="/shop"
                className="text-xs font-semibold text-brand-primary hover:underline flex items-center gap-1"
              >
                <span>Browse Full Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        ) : (
          <div className="py-16 text-center">
            <EmptyState
              title="No active sale items right now"
              description="Check back soon for upcoming limited-run promotional releases."
              primaryAction={{
                label: "Explore All Pieces",
                href: "/shop",
              }}
            />
          </div>
        )}
      </Container>
    </div>
  );
}
