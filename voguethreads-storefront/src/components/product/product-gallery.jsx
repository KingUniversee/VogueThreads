"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { StorefrontImage } from "@/components/ui/storefront-image";

export function ProductGallery({ images = [], title = "Product" }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const containerRef = useRef(null);

  const validImages = images.length > 0 ? images : [
    { url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1000", alt: title }
  ];

  const currentImage = validImages[activeIndex] || validImages[0];

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : validImages.length - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev < validImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 sm:gap-6 items-start w-full">
      {/* Thumbnails Row (Mobile) / Column (Desktop) */}
      {validImages.length > 1 && (
        <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-y-auto w-full lg:w-24 shrink-0 no-scrollbar py-1">
          {validImages.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={img.url || idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative aspect-[3/4] w-16 lg:w-full rounded-xl overflow-hidden border transition-all duration-200 shrink-0 ${
                  isActive
                    ? "ring-2 ring-brand-primary ring-offset-2 border-transparent scale-[1.02] shadow-sm"
                    : "border-border/70 opacity-70 hover:opacity-100"
                }`}
              >
                <StorefrontImage
                  src={img.url}
                  alt={img.alt || `${title} thumbnail ${idx + 1}`}
                  fill
                  className="object-cover object-center"
                  sizes="96px"
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Main Image Stage */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
        onMouseMove={handleMouseMove}
        className="relative aspect-[3/4] w-full flex-1 rounded-3xl overflow-hidden bg-neutral-100 border border-border/80 group cursor-crosshair"
      >
        {/* Standard Image */}
        <StorefrontImage
          src={currentImage.url}
          alt={currentImage.alt || title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className={`object-cover object-center transition-transform duration-300 ${
            isZoomed ? "scale-125" : "scale-100"
          }`}
          style={
            isZoomed
              ? {
                  transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                }
              : undefined
          }
        />

        {/* Mobile Navigation Arrows */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-surface/85 hover:bg-surface text-text-primary shadow-md backdrop-blur-md transition-all sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-surface/85 hover:bg-surface text-text-primary shadow-md backdrop-blur-md transition-all sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Zoom Hint Indicator */}
        <div className="absolute bottom-4 right-4 pointer-events-none p-2 rounded-xl bg-black/40 text-white backdrop-blur-md text-xs hidden sm:flex items-center gap-1.5 opacity-70 group-hover:opacity-0 transition-opacity">
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Roll over to zoom</span>
        </div>

        {/* Mobile Slide Indicator Dots */}
        {validImages.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5 lg:hidden pointer-events-none">
            {validImages.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeIndex
                    ? "w-5 bg-brand-primary"
                    : "w-1.5 bg-black/30 backdrop-blur-sm"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
