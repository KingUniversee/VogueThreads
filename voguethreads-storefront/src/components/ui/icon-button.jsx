import React from "react";
import { cn } from "@/lib/utils";

export const IconButton = React.forwardRef(
  ({ className, variant = "default", size = "md", children, "aria-label": ariaLabel, ...props }, ref) => {
    const variants = {
      default: "text-vt-black hover:bg-black/5 active:bg-black/10",
      dark: "text-white/80 hover:text-white hover:bg-white/10 active:bg-white/15",
      glass: "bg-white/70 backdrop-blur-md border border-white/80 text-vt-black hover:bg-white shadow-sm active:scale-95",
      glassDark: "bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 active:scale-95",
      solid: "bg-vt-black text-white hover:bg-neutral-800 active:scale-95",
    };

    const sizes = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
