import React from "react";
import { cn } from "@/lib/utils";

/**
 * Editorial Container for constraining maximum page widths with responsive gutters.
 */
export function Container({ className, children, ...props }) {
  return (
    <div
      className={cn("w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Editorial Section with generous vertical rhythm.
 */
export function Section({ className, children, ...props }) {
  return (
    <section className={cn("py-12 sm:py-16 lg:py-24", className)} {...props}>
      {children}
    </section>
  );
}

/**
 * Editorial Grid for products and content tiles.
 */
export function Grid({ className, cols = 4, children, ...props }) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
  };

  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-6 lg:gap-8",
        colClasses[cols] || colClasses[4],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
