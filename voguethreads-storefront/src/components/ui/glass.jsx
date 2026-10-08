import React from "react";
import { cn } from "@/lib/utils";

/**
 * Basic liquid glass surface overlay with customizable tint.
 */
export function GlassSurface({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-white/60 backdrop-blur-md border border-white/70 shadow-glass",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Editorial content panel with layered refraction and rounded corners.
 */
export function GlassPanel({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-white/80 backdrop-blur-xl border border-white/90 shadow-glass-lg rounded-2xl relative overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Light gradient sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * Interactive card with subtle hover lift and glass border highlight.
 */
export function GlassCard({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-white/70 backdrop-blur-md border border-white/80 shadow-card hover:shadow-glass hover:-translate-y-0.5 transition-all duration-300 rounded-2xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Pill-shaped glass element for tags and quick actions.
 */
export function GlassPill({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-white/80 text-xs font-medium text-vt-black shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Prominent curved glass slab modeled after Screen 1 of the VogueThreads mockup.
 */
export function HeroGlassSlab({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "relative rounded-3xl p-8 sm:p-12 overflow-hidden",
        "bg-gradient-to-br from-white/20 via-white/10 to-transparent",
        "backdrop-blur-2xl border border-white/30 shadow-[0_24px_64px_rgba(0,0,0,0.4)]",
        className
      )}
      {...props}
    >
      {/* Refraction highlight at top edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
