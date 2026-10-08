import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { ProductCard } from "@/components/product/product-card";
import { FacetedFilters } from "@/components/shop/faceted-filters";
import { ShopHeader } from "@/components/shop/shop-header";
import { ShopPagination } from "@/components/shop/shop-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { getCategoryBySlug, getProducts, getFilterFacets } from "@/lib/catalog";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category Not Found | VogueThreads" };

  return {
    title: `${category.name} | VogueThreads`,
    description: category.description || `Explore ${category.name} at VogueThreads. Architectural tailoring and elevated silhouettes.`,
    openGraph: {
      title: `${category.name} | VogueThreads`,
      description: category.description,
      images: category.imageUrl ? [{ url: category.imageUrl }] : [],
    },
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) {
    notFound();
  }

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
      category: slug,
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
        name: "Shop",
        item: "https://voguethreads.in/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `https://voguethreads.in/category/${category.slug}`,
      },
    ],
  };

  // ItemList Schema
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category.name} Catalog`,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />

      <Container>
        {/* Breadcrumb Bar */}
        <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-6">
          <Link href="/" className="hover:text-text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/shop" className="hover:text-text-primary transition-colors">
            Shop
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-text-primary">{category.name}</span>
        </nav>

        {/* Category Banner Hero */}
        {category.imageUrl && (
          <div className="relative aspect-[21/9] sm:aspect-[24/7] w-full rounded-3xl overflow-hidden mb-8 border border-border/70 shadow-sm bg-neutral-900">
            <StorefrontImage
              src={category.imageUrl}
              alt={category.name}
              fill
              priority
              className="object-cover object-center opacity-70 filter brightness-90"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 text-white max-w-xl">
              <span className="text-xs uppercase font-semibold tracking-wider text-amber-300 block mb-1">
                CATEGORY ARCHIVE
              </span>
              <h1 className="text-2xl sm:text-5xl font-black tracking-tight leading-tight">
                {category.name}
              </h1>
              {category.description && (
                <p className="text-xs sm:text-sm text-neutral-200 mt-2 line-clamp-2">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Subcategories (if any) */}
        {category.subcategories?.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted shrink-0 mr-1">
              Subcategories:
            </span>
            {category.subcategories.map((sub) => (
              <Link
                key={sub.slug}
                href={`/category/${sub.slug}`}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-surface border border-border/70 text-text-primary hover:border-brand-primary hover:bg-surface-elevated transition-colors shrink-0"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}

        {/* Header without Banner (Fallback) */}
        {!category.imageUrl && (
          <ShopHeader
            title={category.name}
            description={category.description}
            totalCount={total}
            currentSort={sort}
            facets={facets}
          />
        )}

        {/* Main Stage with Sidebar and Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start mt-6">
          <FacetedFilters facets={facets} totalProducts={total} />

          <main className="flex-1 w-full">
            {products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {products.map((product, idx) => (
                    <ProductCard key={product.slug} product={product} priority={idx < 4} />
                  ))}
                </div>

                <ShopPagination currentPage={page} totalPages={totalPages} />
              </>
            ) : (
              <div className="py-16 text-center">
                <EmptyState
                  title={`No pieces found in ${category.name}`}
                  description="We couldn't find any products matching your specific filters in this category."
                  primaryAction={{
                    label: "Clear Category Filters",
                    href: `/category/${category.slug}`,
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
