"use client";

import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";

export function StorefrontImage({
  src,
  alt = "Product image",
  fill = false,
  width,
  height,
  className,
  priority = false,
  unoptimized,
  sizes,
  fallback = null,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // If no source or failed to load, show graceful editorial placeholder
  if (!src || hasError) {
    if (fallback) return fallback;
    return (
      <div
        className={cn(
          "w-full h-full min-h-[140px] flex flex-col items-center justify-center bg-vt-stone/50 text-vt-muted select-none",
          fill ? "absolute inset-0" : "",
          className
        )}
      >
        <ImageIcon className="w-8 h-8 stroke-[1.25] mb-2 opacity-50" />
        <span className="text-[10px] tracking-[0.2em] font-semibold uppercase opacity-60">
          VogueThreads
        </span>
      </div>
    );
  }

  const isCdn = typeof src === "string" && (src.includes("unsplash.com") || src.includes("dicebear.com"));
  const isUpload = typeof src === "string" && src.startsWith("/uploads");
  const shouldSkipOptimization = unoptimized !== undefined ? unoptimized : (isCdn || isUpload);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-vt-stone/30",
        fill ? "w-full h-full" : "inline-block",
        className
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-vt-stone/60 animate-pulse" />
      )}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        priority={priority}
        unoptimized={shouldSkipOptimization}
        sizes={sizes || (fill ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" : undefined)}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className={cn(
          "transition-all duration-500",
          isLoading ? "scale-105 blur-sm opacity-0" : "scale-100 blur-0 opacity-100",
          fill ? "object-cover object-center" : ""
        )}
        {...props}
      />
    </div>
  );
}
