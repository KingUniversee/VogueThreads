import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Globe, ExternalLink } from "lucide-react";
import { Container } from "@/components/ui/container";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { ProductCard } from "@/components/product/product-card";
import { FacetedFilters } from "@/components/shop/faceted-filters";
import { ShopHeader } from "@/components/shop/shop-header";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { getBrandBySlug, getProducts, getFilterFacets } from "@/lib/catalog";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Brand Not Found | VogueThreads" };

  return {
    title: `${brand.name} | VogueThreads Brand Registry`,
    description: brand.description || `Discover ${brand.name} at VogueThreads. Luxury garments and architectural designs.`,
    openGraph: {
      title: `${brand.name} | VogueThreads`,
      description: brand.description,
      images: brand.coverImageUrl ? [{ url: brand.coverImageUrl }] : [],
    },
  };
}

export default async function BrandPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;

  const brand = await getBrandBySlug(slug);
  if (!brand) {
    notFound();
  }

  const category = sp?.category || "";
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
      brand: slug,
      category,
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
        name: "Brands",
        item: "https://voguethreads.in/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: brand.name,
        item: `https://voguethreads.in/brand/${brand.slug}`,
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
          <Link href="/shop" className="hover:text-text-primary transition-colors">
            Shop
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-text-primary">{brand.name}</span>
        </nav>

        {/* Brand Bio Header Card */}
        <div className="p-6 sm:p-10 rounded-3xl bg-surface border border-border/70 mb-10 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8">
          {/* Brand Logo Avatar */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-neutral-100 border border-border/80 shrink-0 shadow-sm">
            <StorefrontImage
              src={brand.logoUrl || "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=200"}
              alt={brand.name}
              fill
              className="object-cover object-center"
              sizes="96px"
            />
          </div>

          {/* Brand Story */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
                {brand.name}
              </h1>
              {brand.website && (
                <a
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-brand-primary transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Official Archive</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
            </div>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed max-w-2xl">
              {brand.description}
            </p>
          </div>
        </div>

        {/* Catalog Stage */}
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
                  title={`No pieces found under ${brand.name}`}
                  description="Try resetting your filters."
                  primaryAction={{
                    label: "Clear Filters",
                    href: `/brand/${brand.slug}`,
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
