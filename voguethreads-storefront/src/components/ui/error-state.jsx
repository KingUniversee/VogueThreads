import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this section.",
  retry,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl bg-red-50/50 border border-red-100 max-w-lg mx-auto my-8",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-vt-accent mb-5">
        <AlertCircle className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h4 className="font-display text-2xl text-vt-black font-medium tracking-tight mb-2">
        {title}
      </h4>
      <p className="text-sm text-vt-graphite max-w-md mb-6 leading-relaxed">
        {message}
      </p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}
