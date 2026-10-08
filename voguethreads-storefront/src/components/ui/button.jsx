import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const buttonVariants = cva(
  [
    "group inline-flex items-center justify-center font-medium select-none text-center whitespace-nowrap flex-nowrap",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed",
    "motion-reduce:transition-none motion-reduce:transform-none",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-vt-black text-white border border-transparent shadow-sm",
          "hover:bg-[#1C1C1F] hover:-translate-y-0.5 hover:shadow-md",
          "active:translate-y-0 active:scale-[0.98]",
          "focus-visible:ring-vt-black focus-visible:ring-offset-white",
        ].join(" "),
        secondary: [
          "bg-vt-stone/70 text-vt-black border border-vt-border/70 shadow-sm",
          "hover:bg-vt-stone hover:border-vt-border hover:-translate-y-0.5 hover:shadow",
          "active:translate-y-0 active:scale-[0.98]",
          "focus-visible:ring-vt-black focus-visible:ring-offset-white",
        ].join(" "),
        outline: [
          "bg-transparent text-vt-black border border-vt-black/25",
          "hover:bg-vt-black hover:text-white hover:border-vt-black hover:-translate-y-0.5 hover:shadow-sm",
          "active:translate-y-0 active:scale-[0.98]",
          "focus-visible:ring-vt-black focus-visible:ring-offset-white",
        ].join(" "),
        ghost: [
          "bg-transparent text-vt-black border border-transparent",
          "hover:bg-black/[0.05] hover:text-vt-black",
          "active:scale-[0.98]",
          "focus-visible:ring-vt-black focus-visible:ring-offset-white",
        ].join(" "),
        glass: [
          "bg-white/80 backdrop-blur-md text-vt-black border border-white/70 shadow-glass",
          "hover:bg-white hover:border-white hover:-translate-y-0.5 hover:shadow-md",
          "active:translate-y-0 active:scale-[0.98]",
          "focus-visible:ring-vt-black focus-visible:ring-offset-white",
        ].join(" "),
        glassDark: [
          "bg-black/60 backdrop-blur-md text-white border border-white/15 shadow-glass",
          "hover:bg-black/80 hover:border-white/30 hover:-translate-y-0.5",
          "active:translate-y-0 active:scale-[0.98]",
          "focus-visible:ring-white focus-visible:ring-offset-black",
        ].join(" "),
        accent: [
          "bg-vt-accent text-white border border-transparent shadow-sm",
          "hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-md",
          "active:translate-y-0 active:scale-[0.98]",
          "focus-visible:ring-vt-accent focus-visible:ring-offset-white",
        ].join(" "),
      },
      size: {
        compact: "h-9 px-3.5 text-xs font-semibold tracking-wider uppercase rounded-xl gap-2",
        sm: "h-9 px-3.5 text-xs font-semibold tracking-wider uppercase rounded-xl gap-2",
        default: "h-11 px-5 sm:px-6 text-xs font-semibold tracking-wider uppercase rounded-xl sm:rounded-2xl gap-2.5",
        md: "h-11 px-5 sm:px-6 text-xs font-semibold tracking-wider uppercase rounded-xl sm:rounded-2xl gap-2.5",
        large: "h-12 sm:h-13 px-7 sm:px-8 text-xs sm:text-sm font-semibold tracking-wider uppercase rounded-xl sm:rounded-2xl gap-3",
        lg: "h-12 sm:h-13 px-7 sm:px-8 text-xs sm:text-sm font-semibold tracking-wider uppercase rounded-xl sm:rounded-2xl gap-3",
        icon: "h-10 w-10 p-0 rounded-xl flex items-center justify-center shrink-0",
        iconSm: "h-8 w-8 p-0 rounded-lg flex items-center justify-center shrink-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loading = false,
      loadingText,
      leftIcon: LeftIconProp,
      rightIcon: RightIconProp,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isSpinnerActive = isLoading || loading;

    const renderIcon = (IconInput, defaultClassName = "w-4 h-4 shrink-0") => {
      if (!IconInput) return null;
      if (React.isValidElement(IconInput)) {
        return IconInput;
      }
      if (typeof IconInput === "function" || typeof IconInput === "object") {
        const IconComponent = IconInput;
        return <IconComponent className={defaultClassName} />;
      }
      return null;
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ref,
        className: cn(buttonVariants({ variant, size }), className, children.props.className),
        ...props,
      });
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isSpinnerActive}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isSpinnerActive ? (
          <>
            <Loader2 className="w-4 h-4 shrink-0 animate-spin text-current" />
            {loadingText ? <span>{loadingText}</span> : children}
          </>
        ) : (
          <>
            {renderIcon(LeftIconProp, "w-4 h-4 shrink-0 transition-transform group-hover:scale-105")}
            {children && <span>{children}</span>}
            {renderIcon(
              RightIconProp,
              "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
