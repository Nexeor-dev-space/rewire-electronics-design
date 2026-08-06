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
        /** High-emphasis: inverted — light on dark reads as premium. */
        primary: "bg-ink text-void hover:bg-white",
        /** Brand moment: copper. Reserve for drop CTAs ("Notify me", "Reserve"). */
        accent:
          "bg-copper text-void hover:bg-copper-bright shadow-(--shadow-glow)",
        /** Medium emphasis: hairline outline that solidifies on hover. */
        outline:
          "border border-line-strong text-ink hover:border-ink hover:bg-white/5",
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
