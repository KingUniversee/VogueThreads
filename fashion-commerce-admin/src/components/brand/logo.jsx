"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Premium VogueThreads VT Monogram Vector Mark
 * Pure SVG, zero external dependencies, works in monochrome and with currentColor.
 */
export function VTMark({
  size = "md",
  theme = "dark",
  className = "",
  badge = true,
  ...props
}) {
  const sizeMap = {
    xs: { box: "h-5 w-5", svg: "h-3.5 w-3.5", radius: "rounded" },
    sm: { box: "h-7 w-7", svg: "h-4.5 w-4.5", radius: "rounded-md" },
    md: { box: "h-8.5 w-8.5", svg: "h-5 w-5", radius: "rounded-md" },
    lg: { box: "h-10 w-10", svg: "h-6 w-6", radius: "rounded-lg" },
    xl: { box: "h-14 w-14", svg: "h-8.5 w-8.5", radius: "rounded-xl" },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  // Theme styling for the mark / container
  const badgeThemeClasses = {
    // Light theme (for dark backgrounds, e.g. sidebar, dark login panel)
    light: "bg-slate-900 text-white border border-slate-800 shadow-sm",
    // Dark theme (for light backgrounds, e.g. white header, login card)
    dark: "bg-slate-950 text-white shadow-sm",
    // White theme (pure white background)
    white: "bg-white text-slate-950 border border-slate-200 shadow-xs",
    // Pure transparent (relies strictly on parent text color)
    none: "bg-transparent text-current",
  };

  const selectedBadgeTheme = badge
    ? badgeThemeClasses[theme] || badgeThemeClasses.dark
    : badgeThemeClasses.none;

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 select-none transition-all duration-200",
        badge ? currentSize.box : "h-auto w-auto",
        badge && currentSize.radius,
        selectedBadgeTheme,
        className
      )}
      {...props}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", badge ? currentSize.svg : currentSize.box)}
        aria-hidden="true"
      >
        {/* T Crossbar */}
        <rect x="8" y="9" width="32" height="5" rx="1" fill="currentColor" />
        {/* T Vertical Stem */}
        <rect x="21.5" y="14" width="5" height="18.5" rx="0.75" fill="currentColor" />
        {/* V Chevron */}
        <path d="M8 16H13.2L24 35.5L34.8 16H40L24 41Z" fill="currentColor" />
      </svg>
      <span className="sr-only">VogueThreads VT Mark</span>
    </div>
  );
}

/**
 * Reusable VogueThreads Brand Logo
 * 
 * Props:
 * - variant: "full" (mark + wordmark) | "compact" (mark only)
 * - theme: "light" (for dark backgrounds) | "dark" (for light backgrounds) | "white"
 * - size: "sm" | "md" | "lg" | "xl"
 * - showSubtext: boolean (default true for full)
 * - subtext: string (default "COMMERCE ADMIN")
 * - href: optional link destination (e.g. "/")
 * - collapsed: boolean alias for variant="compact"
 */
export function Logo({
  variant = "full",
  theme = "light",
  size = "md",
  showSubtext = true,
  subtext = "COMMERCE ADMIN",
  href,
  collapsed = false,
  className = "",
  badge = true,
  ...props
}) {
  const isCompact = variant === "compact" || collapsed;

  // Typography scaling based on size
  const fontConfig = {
    sm: {
      title: "text-xs tracking-[0.18em]",
      sub: "text-[8px] tracking-[0.24em] mt-0.5",
      gap: "gap-2",
    },
    md: {
      title: "text-xs font-bold tracking-[0.2em]",
      sub: "text-[9px] tracking-[0.26em] mt-0.5",
      gap: "gap-2.5",
    },
    lg: {
      title: "text-sm font-bold tracking-[0.22em]",
      sub: "text-[10px] tracking-[0.28em] mt-1",
      gap: "gap-3",
    },
    xl: {
      title: "text-lg font-bold tracking-[0.25em]",
      sub: "text-xs tracking-[0.3em] mt-1.5",
      gap: "gap-3.5",
    },
  };

  const currentFont = fontConfig[size] || fontConfig.md;

  // Colors based on theme
  const textColorClasses = {
    // Light theme (for dark backgrounds like sidebar or dark login side)
    light: {
      title: "text-slate-100",
      sub: "text-slate-400",
    },
    // Dark theme (for light backgrounds)
    dark: {
      title: "text-slate-950",
      sub: "text-slate-500",
    },
    // White theme (pure white)
    white: {
      title: "text-white",
      sub: "text-white/70",
    },
  };

  const selectedTextColor = textColorClasses[theme] || textColorClasses.light;

  const content = (
    <div
      className={cn(
        "flex items-center transition-opacity duration-200 select-none overflow-hidden",
        isCompact ? "justify-center" : currentFont.gap,
        className
      )}
      {...props}
    >
      <VTMark size={size} theme={theme} badge={badge} />

      {!isCompact && (
        <div className="flex flex-col min-w-0 leading-tight">
          <span
            className={cn(
              "font-bold uppercase truncate font-sans",
              currentFont.title,
              selectedTextColor.title
            )}
          >
            VogueThreads
          </span>
          {showSubtext && (
            <span
              className={cn(
                "font-mono uppercase truncate font-medium",
                currentFont.sub,
                selectedTextColor.sub
              )}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 rounded-sm",
          isCompact ? "w-full justify-center" : ""
        )}
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
