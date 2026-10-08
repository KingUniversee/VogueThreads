import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-vt-stone text-vt-black",
        dark: "bg-vt-black text-white",
        discount: "bg-vt-accent text-white font-bold tracking-tight shadow-sm",
        success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
        danger: "bg-red-500/10 text-red-600 border border-red-500/20",
        outline: "border border-vt-border text-vt-graphite",
        glass: "bg-white/70 backdrop-blur-md border border-white/80 text-vt-black shadow-sm",
        glassDark: "bg-black/60 backdrop-blur-md border border-white/15 text-white shadow-sm",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] rounded-full uppercase tracking-wider",
        md: "px-2.5 py-1 text-xs rounded-full uppercase tracking-wider",
        lg: "px-3.5 py-1.5 text-xs rounded-full uppercase tracking-wider",
        square: "h-9 w-9 p-0 text-xs font-semibold rounded-lg flex items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

export function Badge({ className, variant, size, children, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </span>
  );
}
