import React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef(
  ({ className, type = "text", error, label, helperText, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-vt-graphite">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full h-11 px-4 rounded-xl text-sm text-vt-black bg-white border border-vt-border placeholder:text-vt-muted transition-all duration-200 focus-visible:outline-none focus-visible:border-vt-black focus-visible:ring-1 focus-visible:ring-vt-black disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-vt-accent focus-visible:border-vt-accent focus-visible:ring-vt-accent",
            className
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-vt-accent font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-vt-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
