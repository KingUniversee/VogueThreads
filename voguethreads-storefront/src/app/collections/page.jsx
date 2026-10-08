import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { getCollections } from "@/lib/catalog";

export const metadata = {
  title: "Curated Collections | VogueThreads",
  description:
    "Explore limited-run seasonal drops, architectural capsule collections, and runway exclusives from VogueThreads.",
};

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="w-full pb-20 pt-8 sm:pt-12 bg-background">
      <Container>
        {/* Editorial Header */}
        <div className="pb-8 border-b border-border/60 mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest text-brand-primary uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Capsule Archives</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
              Curated Collections
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-text-muted max-w-md leading-relaxed">
            Limited-run architectural drops and seasonal edits. Each capsule is engineered with custom textiles and strict design codes.
          </p>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collections.map((col, idx) => (
            <Link
              key={col.slug}
              href={`/collection/${col.slug}`}
              className="group relative flex flex-col rounded-[2.25rem] p-4 sm:p-5 transition-all duration-500 liquid-glass-card hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
              style={{
                background: "linear-gradient(135deg, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.32) 50%, rgba(255, 255, 255, 0.55) 100%)",
                backdropFilter: "blur(28px) saturate(190%)",
                WebkitBackdropFilter: "blur(28px) saturate(190%)",
                border: "1.5px solid rgba(255, 255, 255, 0.85)",
                boxShadow: "inset 0 1px 2px 0 #ffffff, 0 16px 40px -6px rgba(0, 0, 0, 0.08), 0 6px 16px -2px rgba(0, 0, 0, 0.04)",
              }}
            >
              {/* Inset Panoramic Image Frame */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/[0.04] shadow-xs">
                <StorefrontImage
                  src={col.bannerUrl || col.imageUrl || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85"}
                  alt={col.name}
                  fill
                  priority={idx < 2}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Floating Capsule Badge in Image */}
                <div className="absolute top-3 left-3 z-10">
                  {col.isFeatured ? (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#141414]/90 backdrop-blur-md text-amber-300 border border-white/20 shadow-sm flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      FEATURED CAPSULE
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white/85 backdrop-blur-md text-[#141414] border border-white/80 shadow-sm">
                      EDITORIAL DROP
                    </span>
                  )}
                </div>
              </div>

              {/* Editorial Content Below Image */}
              <div className="flex flex-col flex-1 pt-4 pb-1 px-1">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-[#141414] group-hover:text-black transition-colors">
                  {col.name}
                </h3>
                <p className="text-xs sm:text-sm text-[#5A5A5E] line-clamp-2 leading-relaxed mt-1.5">
                  {col.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
