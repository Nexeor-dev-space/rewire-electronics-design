import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Card — dark machined surfaces.
 * Elevation on this site is expressed through subtle sheen and a 1px
 * edge light, not heavy borders. `floating` adds the deep ambient
 * shadow used for product cards that sit "above" the page.
 */
const cardVariants = cva("rounded-xl", {
  variants: {
    variant: {
      surface: "bg-surface edge-light border border-line",
      /** Radial sheen — for product stages and feature panels. */
      sheen: "surface-gradient edge-light border border-line",
      /** Frosted glass — only over imagery or gradients, never flat color. */
      glass: "glass",
      /** Invisible container — pure layout, editorial contexts. */
      plain: "",
    },
    floating: {
      true: "shadow-(--shadow-float)",
    },
    interactive: {
      true: [
        "transition-[border-color,box-shadow,transform] duration-(--duration-base) ease-(--ease-out-expo)",
        "hover:border-line-strong hover:-translate-y-1",
      ],
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8 md:p-10",
    },
  },
  defaultVariants: {
    variant: "surface",
    padding: "none",
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({
  className,
  variant,
  floating,
  interactive,
  padding,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        cardVariants({ variant, floating, interactive, padding }),
        className,
      )}
      {...props}
    />
  );
}

export { cardVariants };
