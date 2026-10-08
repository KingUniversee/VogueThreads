import React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/components/product/product-card";
import { FacetedFilters } from "@/components/shop/faceted-filters";
import { ShopHeader } from "@/components/shop/shop-header";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { getProducts, getFilterFacets } from "@/lib/catalog";

export const metadata = {
  title: "Shop All Collections & Streetwear | VogueThreads",
  description:
    "Explore the complete VogueThreads catalog of luxury streetwear, tailored trousers, heavyweight tees, and architectural silhouettes.",
};

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;

  const category = sp?.category || "";
  const brand = sp?.brand || "";
  const collection = sp?.collection || "";
  const gender = sp?.gender || "";
  const size = sp?.size || "";
  const color = sp?.color || "";
  const minPrice = sp?.minPrice || "";
  const maxPrice = sp?.maxPrice || "";
  const inStock = sp?.inStock || "";
  const onSale = sp?.onSale || "";
  const sort = sp?.sort || "featured";
  const page = parseInt(sp?.page || "1", 10);

  const [{ products, total, totalPages }, facets] = await Promise.all([
    getProducts({
      category,
      brand,
      collection,
      gender,
      size,
      color,
      minPrice,
      maxPrice,
      inStock,
      onSale,
      sort,
      page,
      limit: 12,
    }),
    getFilterFacets(),
  ]);

  // ItemList JSON-LD Schema
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "VogueThreads Catalog",
    numberOfItems: total,
    itemListElement: products.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.title,
      url: `https://voguethreads.in/product/${item.slug}`,
    })),
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <Container>
        {/* Page Header with Sort & Counts */}
        <ShopHeader
          title="All Collections"
          description="Engineered with custom textiles, architectural proportions, and timeless minimalism."
          totalCount={total}
          currentSort={sort}
          facets={facets}
        />

        {/* Catalog Main Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start mt-8">
          {/* Faceted Filter Sidebar / Drawer */}
          <FacetedFilters facets={facets} totalProducts={total} />

          {/* Product Grid Stage */}
          <main className="flex-1 w-full">
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {products.map((product, idx) => (
                    <ProductCard key={product.slug} product={product} priority={idx < 4} />
                  ))}
                </div>

                {/* Pagination */}
                <ShopPagination currentPage={page} totalPages={totalPages} />
              </>
            ) : (
              <div className="py-16 text-center">
                <EmptyState
                  title="No pieces match your filter criteria"
                  description="Try clearing some filter options or reset the price range to explore other silhouettes."
                  primaryAction={{
                    label: "Clear All Filters",
                    href: "/shop",
                  }}
                />
              </div>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
}
