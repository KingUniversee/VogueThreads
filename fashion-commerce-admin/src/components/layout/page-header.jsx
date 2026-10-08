import React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, badge, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-5 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-slate-500 max-w-2xl">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}
