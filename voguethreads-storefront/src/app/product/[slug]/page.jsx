import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { RecentlyViewedTray } from "@/components/product/recently-viewed";
import { getProductBySlug } from "@/lib/catalog";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product Not Found | VogueThreads" };

  const firstImage = product.primaryImages?.[0]?.url || "";
  const lowestPrice = product.variants?.[0]?.price || 0;

  return {
    title: `${product.title} | VogueThreads`,
    description: product.shortDescription || product.description,
    alternates: {
      canonical: `https://voguethreads.in/product/${product.slug}`,
    },
    openGraph: {
      title: `${product.title} | VogueThreads`,
      description: product.shortDescription,
      url: `https://voguethreads.in/product/${product.slug}`,
      siteName: "VogueThreads",
      images: firstImage
        ? [
            {
              url: firstImage,
              width: 1000,
              height: 1333,
              alt: product.title,
            },
          ]
        : [],
    },
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Lowest variant price for schema
  const prices = (product.variants || []).map((v) => v.price).filter((p) => typeof p === "number");
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : minPrice;

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
        name: product.categoryId?.name || "Shop",
        item: product.categoryId?.slug
          ? `https://voguethreads.in/category/${product.categoryId.slug}`
          : "https://voguethreads.in/shop",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: `https://voguethreads.in/product/${product.slug}`,
      },
    ],
  };

  // Product Schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.shortDescription || product.description,
    image: (product.primaryImages || []).map((img) => img.url),
    sku: product.variants?.[0]?.sku || product.slug,
    brand: {
      "@type": "Brand",
      name: product.brandId?.name || "VogueThreads",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: minPrice,
      highPrice: maxPrice,
      offerCount: product.variants?.length || 1,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: "VogueThreads",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.reviewMetrics?.averageRating || 5.0,
      reviewCount: product.reviewMetrics?.reviewCount || 1,
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <div className="min-h-screen py-6 sm:py-10 bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <Container>
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-8 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          {product.categoryId && (
            <>
              <Link
                href={`/category/${product.categoryId.slug}`}
                className="hover:text-text-primary transition-colors"
              >
                {product.categoryId.name}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
            </>
          )}
          <span className="font-semibold text-text-primary truncate">
            {product.title}
          </span>
        </nav>

        {/* Interactive PDP View */}
        <ProductDetailView product={product} />
      </Container>

      {/* Recently Viewed Shelf */}
      <RecentlyViewedTray currentSlug={product.slug} />
    </div>
  );
}
