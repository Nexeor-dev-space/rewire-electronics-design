import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

/**
 * Button — the primary conversion surface.
 * Pill-shaped, quiet by default, decisive on interaction.
 * Press feedback is a subtle scale-down; hover is a brightness shift.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2.5 select-none",
    "rounded-full font-medium tracking-tight whitespace-nowrap",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
    "active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        /**
         * High-emphasis commerce action. The Rewire burnt-orange fill
         * (`--color-accent`) against the graphite ground — the same warm
         * note as the wordmark dot and the price, so the commit action
         * reads as the brand asking, not a third-party widget. White
         * text on the fill (~4.5:1, AA at these sizes). Reserved for
         * the moment on any screen that closes the sale (Add to Cart,
         * Notify Me, Join Waitlist, Continue to Checkout). Secondary
         * and tertiary actions reach for `outline` or `ghost` rather
         * than dilute the meaning of this one.
         */
        primary: "bg-accent text-white hover:bg-accent-hover",
        /** Drop-level moment — same commerce fill as primary. */
        accent: "bg-accent text-white hover:bg-accent-hover",
        /**
         * Inverse for the rare surface where the accent is unavailable
         * (e.g. a blue plate that already carries the accent). Bright
         * chip on the graphite ground.
         */
        inverse: "bg-ink text-void hover:bg-ink-hover",
        /**
         * Secondary — the hairline pill. `line-strong` is a 14% white
         * border on dark, so the button reads as a raised edge rather
         * than a cut line, and hover fills to the accent so the state
         * change matches the meaning shift (from "see more" to "commit").
         */
        outline:
          "border border-line-strong text-ink hover:border-accent hover:bg-accent hover:text-white",
        /** Low emphasis: text-adjacent actions. */
        ghost: "text-ink-secondary hover:text-ink hover:bg-white/5",
        /** Inline editorial link with animated underline. */
        link: [
          "rounded-none px-0 text-ink underline-offset-6",
          "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:scale-x-0 after:bg-current",
          "after:transition-transform after:duration-(--duration-base) after:ease-(--ease-out-expo)",
          "hover:after:origin-left hover:after:scale-x-100",
          "active:scale-100",
        ],
      },
      size: {
        sm: "h-10 px-5 text-sm",
        md: "h-12 px-7 text-sm",
        lg: "h-14 px-9 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner and disables the button. Keeps width stable. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="absolute size-4" />}
      <span
        className={cn(
          "inline-flex items-center gap-2.5",
          loading && "opacity-0",
        )}
      >
        {children}
      </span>
    </button>
  ),
);
Button.displayName = "Button";

export { buttonVariants };
