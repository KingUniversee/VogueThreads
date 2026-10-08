import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({
  icon: IconOrNode,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  className,
}) {
  const renderIcon = () => {
    if (!IconOrNode) return null;

    // Direct React element passed, e.g. <Heart className="..." />
    if (React.isValidElement(IconOrNode)) {
      return IconOrNode;
    }

    // Component passed, e.g. icon={Heart}
    if (typeof IconOrNode === "function" || typeof IconOrNode === "object") {
      const IconComponent = IconOrNode;
      return <IconComponent className="w-8 h-8 stroke-[1.5] text-vt-black" />;
    }

    return null;
  };

  const iconElement = renderIcon();

  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-14 rounded-3xl bg-white/70 border border-vt-stone backdrop-blur-md max-w-xl mx-auto my-8 shadow-card transition-all",
        className
      )}
    >
      {iconElement && (
        <div className="w-16 h-16 rounded-2xl bg-vt-stone/50 border border-vt-border/70 flex items-center justify-center text-vt-black mb-6 shadow-inner transition-transform duration-300 hover:scale-105">
          {iconElement}
        </div>
      )}

      <h3 className="font-display text-2xl sm:text-3xl text-vt-black font-medium tracking-tight mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-vt-graphite max-w-md mb-8 leading-relaxed font-light">
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {actionLabel &&
            (actionHref ? (
              <Link href={actionHref} className="w-full sm:w-auto">
                <Button variant="primary" size="default" className="w-full sm:w-auto">
                  {actionLabel}
                </Button>
              </Link>
            ) : (
              <Button variant="primary" size="default" onClick={onAction} className="w-full sm:w-auto">
                {actionLabel}
              </Button>
            ))}

          {secondaryActionLabel &&
            (secondaryActionHref ? (
              <Link href={secondaryActionHref} className="w-full sm:w-auto">
                <Button variant="secondary" size="default" className="w-full sm:w-auto">
                  {secondaryActionLabel}
                </Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                size="default"
                onClick={onSecondaryAction}
                className="w-full sm:w-auto"
              >
                {secondaryActionLabel}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
