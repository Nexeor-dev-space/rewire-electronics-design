import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — technical labels in the mono voice.
 * Used for drop status, condition grades, edition numbers, categories.
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 rounded-full",
    "font-mono text-[0.6875rem] uppercase tracking-[0.14em] leading-none",
    "px-3 py-1.5",
  ],
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-ink-secondary edge-light",
        outline: "border border-line-strong text-ink-secondary",
        copper: "bg-copper/10 text-copper border border-copper/25",
        /** Live drop — pulsing dot signals urgency without shouting. */
        live: "bg-live/10 text-live border border-live/25",
        warn: "bg-warn/10 text-warn border border-warn/25",
        soldOut: "bg-surface-2 text-ink-muted line-through decoration-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === "live" && (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-live animate-pulse-dot"
        />
      )}
      {children}
    </span>
  );
}

export { badgeVariants };
