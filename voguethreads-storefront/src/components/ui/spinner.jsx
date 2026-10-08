import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className, size = "md" }) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <Loader2
      className={cn("animate-spin text-vt-black", sizes[size] || sizes.md, className)}
    />
  );
}

export function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="min-h-[400px] w-full flex flex-col items-center justify-center space-y-4 py-20">
      <Spinner size="lg" />
      <p className="text-xs uppercase tracking-widest text-vt-graphite font-medium">
        {message}
      </p>
    </div>
  );
}
