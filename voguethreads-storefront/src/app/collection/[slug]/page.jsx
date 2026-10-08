import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { ProductCard } from "@/components/product/product-card";
import { FacetedFilters } from "@/components/shop/faceted-filters";
import { ShopHeader } from "@/components/shop/shop-header";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { getCollectionBySlug, getProducts, getFilterFacets } from "@/lib/catalog";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return { title: "Collection Not Found | VogueThreads" };

  return {
    title: `${collection.name} | VogueThreads Editorial`,
    description: collection.description || `Explore ${collection.name} by VogueThreads. Architectural tailoring and limited-run silhouettes.`,
    openGraph: {
      title: `${collection.name} | VogueThreads`,
      description: collection.description,
      images: collection.bannerUrl ? [{ url: collection.bannerUrl }] : [],
    },
  };
}

export default async function CollectionPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;

  const collection = await getCollectionBySlug(slug);
  if (!collection) {
    notFound();
  }

  const category = sp?.category || "";
  const brand = sp?.brand || "";
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
      collection: slug,
      category,
      brand,
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

  // Breadcrumb Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://voguethreads.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Collections",
        item: "https://voguethreads.in/collections",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: collection.name,
        item: `https://voguethreads.in/collection/${collection.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen py-8 sm:py-12 bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Container>
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-6">
          <Link href="/" className="hover:text-text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/collections" className="hover:text-text-primary transition-colors">
            Collections
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-text-primary">{collection.name}</span>
        </nav>

        {/* Editorial Collection Hero Banner */}
        <div
          className="relative aspect-[21/9] sm:aspect-[24/8] w-full rounded-[2.25rem] p-3 sm:p-4 mb-10 liquid-glass-card shadow-xl"
          style={{
            background: "linear-gradient(135deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.32) 50%, rgba(255, 255, 255, 0.55) 100%)",
            backdropFilter: "blur(28px) saturate(190%)",
            WebkitBackdropFilter: "blur(28px) saturate(190%)",
            border: "1.5px solid rgba(255, 255, 255, 0.85)",
            boxShadow: "inset 0 1px 2px 0 #ffffff, 0 16px 40px -6px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/[0.04]">
            <StorefrontImage
              src={collection.bannerUrl || collection.imageUrl}
              alt={collection.name}
              fill
              priority
              className="object-cover object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 p-4 sm:p-6 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-xl max-w-xl text-[#141414]">
              <span className="text-[11px] uppercase font-bold tracking-widest text-[#141414]/70 block mb-1">
                EDITORIAL CAPSULE
              </span>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-[#141414]">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-xs sm:text-sm text-[#5A5A5E] mt-1.5 leading-relaxed line-clamp-2">
                  {collection.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Filters & Grid Stage */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <FacetedFilters facets={facets} totalProducts={total} />

          <main className="flex-1 w-full">
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.slug} product={product} />
                  ))}
                </div>

                <ShopPagination currentPage={page} totalPages={totalPages} />
              </>
            ) : (
              <div className="py-16 text-center">
                <EmptyState
                  title="No pieces found in this collection"
                  description="Try adjusting your filter selection."
                  primaryAction={{
                    label: "Clear Filters",
                    href: `/collection/${collection.slug}`,
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
