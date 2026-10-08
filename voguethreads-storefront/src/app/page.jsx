import React from "react";
import Link from "next/link";
import { ArrowRight, Truck, RotateCcw, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { ProductCard } from "@/components/product/product-card";
import { RecentlyViewedTray } from "@/components/product/recently-viewed";
import { getHomeData } from "@/lib/catalog";

export const metadata = {
  title: "VogueThreads | Architectural Luxury & Elevated Essentials",
  description:
    "Explore modern architectural fashion, heavyweight organic cotton tees, French terry fleece, and bespoke tailoring engineered for timeless distinction.",
  openGraph: {
    title: "VogueThreads | Architectural Luxury & Elevated Essentials",
    description: "Modern architectural streetwear, custom textiles, and elevated everyday luxury.",
    url: "https://voguethreads.in",
    siteName: "VogueThreads",
    images: [
      {
        url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200",
        width: 1200,
        height: 630,
        alt: "VogueThreads Summer Monochrome Collection",
      },
    ],
  },
};

export default async function HomePage() {
  const {
    heroSlides,
    categories,
    featuredProducts,
    newArrivals,
    bestSellers,
    featuredCollection,
    activePromotions,
    settings,
  } = await getHomeData();

  const trustBadges = [
    {
      icon: Truck,
      title: "Free Express Shipping",
      subtitle: `On all domestic orders over ₹${settings.freeShippingThreshold}`,
    },
    {
      icon: RotateCcw,
      title: "Hassle-Free Returns",
      subtitle: `${settings.returnWindowDays}-day door-step trial and exchange`,
    },
    {
      icon: ShieldCheck,
      title: "Secure Verification",
      subtitle: "100% encrypted payments via UPI & Cards",
    },
    {
      icon: Sparkles,
      title: "Artisanal Integrity",
      subtitle: "Custom-milled heavyweight organic fabrics",
    },
  ];

  // Organization JSON-LD
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "VogueThreads",
    url: "https://voguethreads.in",
    logo: "https://voguethreads.in/images/logo.png",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-98765-43210",
      contactType: "Customer Support",
      areaServed: "IN",
      availableLanguage: ["English", "Hindi"],
    },
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* 1. Hero Carousel */}
      <section className="relative w-full">
        <HeroCarousel slides={heroSlides} />
      </section>

      {/* 2. Trust Badges Strip */}
      <section className="border-y border-white/60 bg-white/45 backdrop-blur-xl py-6 sm:py-8 shadow-xs">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {trustBadges.map((badge, idx) => {
              const Icon = badge.icon;
              return (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-2xl bg-brand-primary/10 text-brand-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-text-primary tracking-tight">
                      {badge.title}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 leading-snug">
                      {badge.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 3. Shop by Category */}
      <section>
        <Container>
          <div className="flex items-end justify-between mb-8 sm:mb-10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary block mb-1">
                Explore The Archive
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
                Shop By Category
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-xs sm:text-sm font-semibold text-text-muted hover:text-brand-primary flex items-center gap-1 group transition-colors"
            >
              <span>View All Categories</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.slice(0, 8).map((cat, idx) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="group relative flex flex-col rounded-[2rem] p-3 sm:p-3.5 transition-all duration-300 liquid-glass-card hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.30) 50%, rgba(255, 255, 255, 0.50) 100%)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1.5px solid rgba(255, 255, 255, 0.85)",
                  boxShadow: "inset 0 1px 2px 0 #ffffff, 0 14px 36px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)",
                }}
              >
                {/* Inset Image Container */}
                <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-black/[0.04] shadow-xs">
                  <StorefrontImage
                    src={cat.imageUrl}
                    alt={cat.name}
                    fill
                    priority={idx < 4}
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Subtle lower gradient for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  {/* Floating Liquid Glass Category Pill at bottom of image */}
                  <div className="absolute inset-x-2.5 bottom-2.5 p-3 rounded-xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-lg transition-all duration-300 group-hover:bg-white/95 group-hover:shadow-xl">
                    <h3 className="text-xs sm:text-sm font-black tracking-tight text-[#141414] line-clamp-1">
                      {cat.name}
                    </h3>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-black/60 block mt-0.5">
                      {cat.productCount} {cat.productCount === 1 ? "Piece" : "Pieces"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. Active Promotions Banner (if any) */}
      {activePromotions.length > 0 && (
        <section>
          <Container>
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-800 to-black text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-neutral-700/50 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/10 text-amber-300">
                  <Tag className="w-6 h-6" />
                </div>
                <div>
                  <Badge variant="accent" size="sm" className="mb-2">
                    LIMITED RELEASE PROMOTION
                  </Badge>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                    {activePromotions[0].name}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                    {activePromotions[0].description} Use code during checkout.
                  </p>
                </div>
              </div>

              <Button
                asChild
                variant="glass"
                size="lg"
                className="shrink-0 bg-white text-black hover:bg-white/90"
              >
                <Link href="/shop?onSale=true">Shop The Promotion</Link>
              </Button>
            </div>
          </Container>
        </section>
      )}

      {/* 5. Featured Pieces */}
      <section>
        <Container>
          <div className="flex items-end justify-between mb-8 sm:mb-10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary block mb-1">
                Handpicked Silhouettes
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
                Featured Pieces
              </h2>
            </div>
            <Link
              href="/shop"
              className="text-xs sm:text-sm font-semibold text-text-muted hover:text-brand-primary flex items-center gap-1 group transition-colors"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.slice(0, 4).map((product, idx) => (
              <ProductCard key={product.slug} product={product} priority={idx < 4} />
            ))}
          </div>
        </Container>
      </section>

      {/* 6. Featured Editorial Collection */}
      {featuredCollection && (
        <section className="relative overflow-hidden py-14 sm:py-24 bg-gradient-to-b from-[#ECE8E1]/80 via-[#F3F1EC] to-[#EAE6DF]/90 border-y border-[#E2DDD3] text-text-primary">
          <div className="absolute inset-0 opacity-15 mix-blend-multiply pointer-events-none">
            <StorefrontImage
              src={featuredCollection.bannerUrl || featuredCollection.imageUrl}
              alt={featuredCollection.name}
              fill
              className="object-cover object-center filter grayscale"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#F3F1EC] via-[#F3F1EC]/85 to-transparent pointer-events-none" />

          <Container className="relative z-10">
            <div className="max-w-xl space-y-4 mb-10">
              <Badge variant="outline" size="sm" className="text-text-primary border-black/15 bg-white/70 backdrop-blur-md">
                EDITORIAL SPOTLIGHT
              </Badge>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-[#141414]">
                {featuredCollection.name}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-lg">
                {featuredCollection.description}
              </p>
              <div className="pt-2">
                <Button asChild variant="primary" size="lg" className="rounded-full shadow-md">
                  <Link href={`/collection/${featuredCollection.slug}`}>
                    Explore Editorial
                  </Link>
                </Button>
              </div>
            </div>

            {/* Collection Product Highlights */}
            {featuredCollection.products?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-black/10">
                {featuredCollection.products.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            )}
          </Container>
        </section>
      )}

      {/* 7. New Arrivals */}
      <section>
        <Container>
          <div className="flex items-end justify-between mb-8 sm:mb-10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary block mb-1">
                Just Released
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
                New Arrivals
              </h2>
            </div>
            <Link
              href="/shop?sort=newest"
              className="text-xs sm:text-sm font-semibold text-text-muted hover:text-brand-primary flex items-center gap-1 group transition-colors"
            >
              <span>See All New</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {newArrivals.slice(0, 4).map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </Container>
      </section>

      {/* 8. Best Sellers */}
      <section>
        <Container>
          <div className="flex items-end justify-between mb-8 sm:mb-10">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary block mb-1">
                Most Wanted
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
                Trending / Best Sellers
              </h2>
            </div>
            <Link
              href="/shop?sort=best-selling"
              className="text-xs sm:text-sm font-semibold text-text-muted hover:text-brand-primary flex items-center gap-1 group transition-colors"
            >
              <span>View Leaderboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.slice(0, 4).map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </Container>
      </section>

      {/* 9. Recently Viewed Products Tray */}
      <RecentlyViewedTray />
    </div>
  );
}
