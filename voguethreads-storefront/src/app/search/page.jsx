import React from "react";
import Link from "next/link";
import { Search, Sparkles, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { getProducts } from "@/lib/catalog";

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const q = sp?.q || "";
  return {
    title: q ? `Search results for "${q}" | VogueThreads` : "Search Catalog | VogueThreads",
    description: `Discover minimalist luxury apparel matching "${q}" at VogueThreads.`,
  };
}

export default async function SearchPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp?.q || "").trim();

  const { products, total } = await getProducts({
    search: q,
    limit: 24,
  });

  // If no results, fetch recommended/trending products
  let recommendations = [];
  if (products.length === 0) {
    const recRes = await getProducts({ limit: 4, sort: "featured" });
    recommendations = recRes.products;
  }

  return (
    <div className="min-h-screen py-10 sm:py-16">
      <Container>
        {/* Search Header */}
        <div className="max-w-2xl mb-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            <Search className="w-4 h-4 text-brand-primary" />
            <span>Search Discovery</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
            {q ? (
              <>
                Results for <span className="text-brand-primary font-normal">&ldquo;{q}&rdquo;</span>
              </>
            ) : (
              "Explore All Pieces"
            )}
          </h1>

          <p className="text-xs sm:text-sm text-text-muted mt-2">
            {q
              ? `Found ${total} ${total === 1 ? "piece" : "pieces"} matching your criteria.`
              : "Search across our complete catalog of architectural silhouettes and luxury essentials."}
          </p>
        </div>

        {/* Results Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          /* Empty State with Curated Recommendations */
          <div className="space-y-12">
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-surface border border-border/70 max-w-xl mx-auto space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-text-primary tracking-tight">
                No exact matches for &ldquo;{q}&rdquo;
              </h3>
              <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                Try checking for typos, searching broader fashion terms, or exploring our curated categories below.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-2">
                {["T-Shirts", "Hoodies", "Pants", "Linen", "Outerwear"].map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#F5F4F0] border border-[#E5E2DC] text-[#141414] hover:bg-[#141414] hover:text-white hover:border-[#141414] transition-all shadow-2xs"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
              <div className="pt-8 border-t border-border/60">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-primary" />
                    <h2 className="text-lg sm:text-xl font-bold text-text-primary tracking-tight">
                      Curated Recommendations
                    </h2>
                  </div>
                  <Link
                    href="/shop"
                    className="text-xs font-semibold text-text-muted hover:text-brand-primary flex items-center gap-1 group"
                  >
                    <span>Browse All</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                  {recommendations.map((product) => (
                    <ProductCard key={product.slug} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
