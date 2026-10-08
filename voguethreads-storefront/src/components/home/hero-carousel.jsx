"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { StorefrontImage } from "@/components/ui/storefront-image";
import { cn } from "@/lib/utils";

// Synchronized Atomic Slide Objects (Content + Image Strictly Paired)
export const HERO_SLIDES = [
  {
    id: 1,
    eyebrow: "New Season 2026",
    hasPulse: true,
    title: "WEAR YOUR STORY",
    description:
      "Premium Streetwear for The Next Generation. Engineered silhouettes, architectural luxury fabrics, and uncompromising minimal aesthetics.",
    primaryCta: { label: "Shop Now", href: "/shop" },
    secondaryCta: { label: "Explore Men", href: "/shop?gender=MEN" },
    collection: "New Collection AW'25",
    edition: "Limited Editorial Release",
    monogram: "VT",
    image: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&w=800&q=85",
    imageAlt: "Men's Heavy Fleece Hoodie Editorial",
    pieceLabel: "Featured Piece",
    pieceTitle: "Overdyed Heavy Fleece Hoodie",
  },
  {
    id: 2,
    eyebrow: "Runway Capsule",
    hasPulse: false,
    title: "ARCHITECTURAL TAILORING",
    description:
      "Deconstructed wool blazers meeting relaxed proportions. Heavyweight suiting textiles engineered for fluid drape and commanding presence.",
    primaryCta: { label: "Explore Tailoring", href: "/collections" },
    secondaryCta: { label: "View Lookbook", href: "/shop" },
    collection: "Atelier Capsule 02",
    edition: "Milano Runway Exclusive",
    monogram: "VT",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=85",
    imageAlt: "Sculpted Architectural Suiting Model",
    pieceLabel: "Runway Showcase",
    pieceTitle: "Sculpted Architectural Coat",
  },
  {
    id: 3,
    eyebrow: "Women's Capsule 2026",
    hasPulse: false,
    title: "MINIMALIST LUXURY",
    description:
      "Elevated contemporary womenswear tailored with organic fibers, fluid silhouettes, and tactile luxury textures for modern wardrobes.",
    primaryCta: { label: "Explore Women", href: "/shop?gender=WOMEN" },
    secondaryCta: { label: "Shop Essentials", href: "/shop?category=t-shirts" },
    collection: "Core Collection 2026",
    edition: "Pure Fiber Craftsmanship",
    monogram: "VT",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=85",
    imageAlt: "Women's Luxury Designer Collection Model",
    pieceLabel: "Wardrobe Essential",
    pieceTitle: "Sculpted Minimalist Silhouette",
  },
  {
    id: 4,
    eyebrow: "Technical Series",
    hasPulse: true,
    title: "MONOCHROME UTILITY",
    description:
      "Tactical hardware, high-density water-resistant ripstop textiles, and articulated ergonomics tailored for the modern urban environment.",
    primaryCta: { label: "Shop Cargo & Pants", href: "/shop?category=pants" },
    secondaryCta: { label: "Archive Sale", href: "/shop?sale=true" },
    collection: "Technical Series X",
    edition: "Numbered Limited Run",
    monogram: "VT",
    image: "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=800&q=85",
    imageAlt: "Articulated Bungee Utility Cargo Model",
    pieceLabel: "Technical Masterpiece",
    pieceTitle: "Articulated Bungee Utility Cargo",
  },
];

export function HeroCarousel({ slides }) {
  const slideList = slides && Array.isArray(slides) && slides.length > 0 ? slides : HERO_SLIDES;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [timerKey, setTimerKey] = useState(0);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slideList.length);
    setTimerKey((k) => k + 1);
  }, [slideList.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slideList.length) % slideList.length);
    setTimerKey((k) => k + 1);
  }, [slideList.length]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setTimerKey((k) => k + 1);
  };

  // 5-second Continuous Autoplay (pauses on hover, focus, and reduced motion)
  useEffect(() => {
    if (isPaused || reducedMotion) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideList.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, reducedMotion, timerKey, slideList.length]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  };

  const activeSlide = slideList[currentSlide] || slideList[0] || HERO_SLIDES[0];

  return (
    <section
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label="VogueThreads Featured Collections Carousel"
      className="relative w-full min-h-[680px] lg:min-h-[780px] bg-gradient-to-b from-[#080808] via-[#121214] to-[#1A1A1E] text-white flex items-center overflow-hidden pt-24 sm:pt-28 lg:pt-32 pb-16 lg:pb-24 focus:outline-none"
    >
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-white/[0.03] blur-[150px] pointer-events-none" />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left: Floating Glass Slab Card */}
          <div className="lg:col-span-7">
            <div className="hero-glass-slab max-w-xl lg:max-w-2xl p-6 sm:p-8 lg:p-10 rounded-3xl border border-white/20 shadow-2xl relative overflow-hidden">
              {/* Slide Content Synchronized Pair */}
              <div className="relative min-h-[340px] sm:min-h-[370px]">
                {slideList.map((slide, idx) => {
                  const isActive = currentSlide === idx;

                  return (
                    <div
                      key={slide.id || idx}
                      className={cn(
                        "transition-all duration-700 ease-out flex flex-col justify-between h-full",
                        reducedMotion ? "transition-none" : "",
                        isActive
                          ? "opacity-100 translate-y-0 relative z-10"
                          : "opacity-0 translate-y-4 absolute inset-0 pointer-events-none z-0"
                      )}
                      aria-hidden={!isActive}
                    >
                      {/* Eyebrow / Badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-white/90 mb-6 w-fit">
                        {slide.hasPulse && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                        <span>{slide.eyebrow}</span>
                      </div>

                      {/* Editorial Title - Balanced Stacking to Prevent Overflow */}
                      <h1 className="font-display font-medium text-3xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] text-white tracking-tight leading-[1.06] mb-6 break-words">
                        {slide.title === "MODERN LUXURY ARCHIVE" ? (
                          <>
                            <span className="block">MODERN LUXURY</span>
                            <span className="block">ARCHIVE</span>
                          </>
                        ) : slide.title.includes(" ") ? (
                          slide.title.split(" ").map((word, wIdx) => (
                            <span key={word} className="block">
                              {word}
                            </span>
                          ))
                        ) : (
                          slide.title
                        )}
                      </h1>

                      {/* Description */}
                      <p className="text-white/70 text-base sm:text-lg font-light max-w-md leading-relaxed mb-8">
                        {slide.description}
                      </p>

                      {/* Synchronized CTAs */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        {slide.primaryCta && (
                          <Link href={slide.primaryCta.href || "/shop"}>
                            <Button
                              variant="primary"
                              size="large"
                              rightIcon={ArrowRight}
                              className="bg-white text-vt-black hover:bg-white/90 shadow-2xl font-semibold w-full sm:w-auto"
                            >
                              {slide.primaryCta.label || slide.primaryCta.text || "Explore Collection"}
                            </Button>
                          </Link>
                        )}
                        {slide.secondaryCta && (
                          <Link href={slide.secondaryCta.href || "/shop"}>
                            <Button
                              variant="glassDark"
                              size="large"
                              className="text-white w-full sm:w-auto"
                            >
                              {slide.secondaryCta.label || slide.secondaryCta.text || "Discover Shop"}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Glass Micro-Card (Collection Metadata & Slide Indicators) */}
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                {/* Collection Meta */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-display font-bold text-sm text-white shrink-0">
                    {activeSlide.monogram || "VT"}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white tracking-wider uppercase">
                      {activeSlide.collection || "VogueThreads"}
                    </p>
                    <p className="text-[11px] text-white/50">{activeSlide.edition || "Curated Capsule"}</p>
                  </div>
                </div>

                {/* Interactive Indicator Dots & Index */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-1.5"
                    role="tablist"
                    aria-label="Carousel slide pagination"
                  >
                    {slideList.map((slide, idx) => (
                      <button
                        key={slide.id || idx}
                        type="button"
                        role="tab"
                        aria-selected={currentSlide === idx}
                        aria-label={`Jump to slide ${idx + 1}: ${slide.title}`}
                        onClick={() => goToSlide(idx)}
                        className={cn(
                          "transition-all duration-300 rounded-full focus-ring cursor-pointer",
                          currentSlide === idx
                            ? "w-6 h-2 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                            : "w-2 h-2 bg-white/30 hover:bg-white/60"
                        )}
                      />
                    ))}
                  </div>

                  <span className="text-xs text-white/70 font-mono">
                    0{currentSlide + 1} / 0{slideList.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Model Showcase Image (Synchronized Pair) */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[3/4] max-w-md mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-white/5">
              {slideList.map((slide, idx) => {
                const isActive = currentSlide === idx;

                return (
                  <div
                    key={slide.id || idx}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-700 ease-in-out",
                      reducedMotion ? "transition-none" : "",
                      isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    )}
                    aria-hidden={!isActive}
                  >
                    <StorefrontImage
                      src={slide.image}
                      alt={slide.imageAlt || slide.title || "VogueThreads"}
                      fill
                      priority={idx === 0}
                      className="object-cover object-top hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
                    <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
                      <span className="text-[10px] tracking-[0.25em] uppercase font-semibold text-white/70 block mb-1">
                        {slide.pieceLabel || "Featured Piece"}
                      </span>
                      <p className="font-display text-xl font-medium">{slide.pieceTitle || slide.title}</p>
                    </div>
                  </div>
                );
              })}

              {/* Prev / Next Chevrons */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous slide"
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all focus-ring shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next slide"
                  className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all focus-ring shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
