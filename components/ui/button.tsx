import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center font-bold tracking-tight whitespace-nowrap transition-all duration-200 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#1D0B2E] text-white hover:bg-[#2B1143] active:bg-[#150723] border border-[#1D0B2E]/30 dark:bg-[#F4F4F5] dark:text-[#1D0B2E] dark:hover:bg-[#FFFFFF] dark:border-transparent shadow-[0_8px_20px_-4px_rgba(29,11,46,0.35)] hover:shadow-[0_12px_24px_-4px_rgba(29,11,46,0.45)] dark:shadow-[0_6px_20px_rgba(255,255,255,0.15)]",
        brand:
          "bg-[#5C31D6] text-white hover:bg-[#4D27BD] active:bg-[#401FA3] border border-white/10 shadow-[0_8px_20px_-4px_rgba(92,49,214,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(92,49,214,0.5)]",
        primary:
          "bg-[#1D0B2E] text-white hover:bg-[#2B1143] active:bg-[#150723] shadow-[0_8px_20px_-4px_rgba(29,11,46,0.35)]",
        secondary:
          "bg-[#F3F2F5] text-[#1D0B2E] hover:bg-[#E7E5EC] active:bg-[#DDD9E4] dark:bg-[#27272A] dark:text-[#F4F4F5] dark:hover:bg-[#323236] border border-[#E8E6ED] dark:border-white/10 shadow-xs",
        outline:
          "border border-[#E2E0E7] bg-white/90 text-[#1D0B2E] hover:bg-[#F3F2F5] hover:border-[#CFCBD9] dark:border-white/15 dark:bg-transparent dark:text-foreground dark:hover:bg-white/10 shadow-2xs",
        ghost:
          "text-foreground hover:bg-[#F3F2F5] dark:hover:bg-white/10 active:bg-[#E7E5EC] dark:active:bg-white/15 border border-transparent",
        destructive:
          "bg-destructive/15 text-destructive hover:bg-destructive/25 dark:bg-destructive/20 dark:hover:bg-destructive/30 border border-destructive/20",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto rounded-none border-none shadow-none active:scale-100 font-normal",
      },
      size: {
        default:
          "h-9.5 pl-4 pr-1.5 text-[13.5px] font-semibold gap-2.5 [&_svg:not([class*='size-'])]:size-4",
        xs: "h-6.5 pl-2.5 pr-1 text-xs font-semibold gap-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 pl-3.5 pr-1 text-xs font-semibold gap-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10.5 pl-5 pr-2 text-sm font-bold gap-3 [&_svg:not([class*='size-'])]:size-4.5",
        xl: "h-12 pl-6 pr-2.5 text-base font-bold gap-3.5 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-9.5 [&_svg:not([class*='size-'])]:size-4",
        "icon-xs": "size-6.5 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10.5 [&_svg:not([class*='size-'])]:size-5",
      },
      shape: {
        rounded: "rounded-[9px]",
        pill: "rounded-full",
        square: "rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "rounded",
    },
  },
);

export interface ButtonProps
  extends ButtonPrimitive.Props,
    VariantProps<typeof buttonVariants> {
  badgeIcon?: React.ReactNode;
}

function Button({
  className,
  variant = "default",
  size = "default",
  shape = "rounded",
  badgeIcon,
  children,
  ...props
}: ButtonProps) {
  const badgeSizeClass =
    size === "xs"
      ? "size-4.5 rounded-[3px]"
      : size === "sm"
      ? "size-5.5 rounded-[4px]"
      : size === "lg" || size === "xl"
      ? "size-7 rounded-[6px]"
      : "size-6.5 rounded-[5px]";

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, shape, className }))}
      {...props}
    >
      {children}
      {badgeIcon && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center bg-zinc-800 text-white font-bold border border-white/10 shadow-2xs transition-transform duration-200 group-hover/button:translate-x-0.5 [&_svg]:text-white",
            badgeSizeClass
          )}
        >
          {badgeIcon}
        </span>
      )}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };

