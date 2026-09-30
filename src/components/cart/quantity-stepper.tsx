"use client";

import { cn } from "@/lib/utils";

type StepperSize = "sm" | "md" | "lg";

const SIZE_STYLES: Record<
  StepperSize,
  { row: string; button: string; icon: string; count: string }
> = {
  sm: { row: "h-10", button: "size-8", icon: "size-3", count: "w-7 text-[0.8125rem]" },
  md: { row: "h-11", button: "size-8", icon: "size-3.5", count: "min-w-7 text-sm font-medium" },
  lg: { row: "h-14", button: "size-11", icon: "size-3.5", count: "min-w-8 text-base font-medium" },
};

interface QuantityStepperProps {
  value: number;
  max: number;
  disabled?: boolean;
  /** False keeps the decrement button enabled but pinned at the floor — used where decrementing at 1 removes the line instead. */
  canDecrement?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Appended to the button labels ("Decrease quantity of {itemLabel}") when more than one stepper can appear on the page. */
  itemLabel?: string;
  /** Wraps the stepper in a labelled group, e.g. for a lone stepper standing in for a named action. */
  groupLabel?: string;
  /** `outline` matches the cart line's hairline pill; `filled` matches the accent CTA it replaces. */
  variant?: "outline" | "filled";
  /** `sm` = cart line row, `md` = a product card's CTA slot, `lg` = the PDP buy panel's CTA slot. */
  size?: StepperSize;
  className?: string;
}

export function QuantityStepper({
  value,
  max,
  disabled,
  canDecrement = true,
  onIncrement,
  onDecrement,
  itemLabel,
  groupLabel,
  variant = "outline",
  size = "sm",
  className,
}: QuantityStepperProps) {
  const filled = variant === "filled";
  const styles = SIZE_STYLES[size];
  const decreaseLabel = itemLabel ? `Decrease quantity of ${itemLabel}` : "Decrease quantity";
  const increaseLabel = itemLabel ? `Increase quantity of ${itemLabel}` : "Increase quantity";

  return (
    <div
      role={groupLabel ? "group" : undefined}
      aria-label={groupLabel}
      className={cn(
        "flex items-center rounded-full",
        styles.row,
        filled ? "justify-between bg-accent px-2 text-white" : "border border-line px-1",
        className,
      )}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled || !canDecrement}
        aria-label={decreaseLabel}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40",
          styles.button,
          filled ? "hover:bg-white/15" : "text-ink hover:bg-ink/5 disabled:opacity-30",
        )}
      >
        <MinusIcon className={styles.icon} />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "text-center font-mono tabular-nums",
          styles.count,
          !filled && "text-ink",
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled || value >= max}
        aria-label={increaseLabel}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40",
          styles.button,
          filled ? "hover:bg-white/15" : "text-ink hover:bg-ink/5 disabled:opacity-30",
        )}
      >
        <PlusIcon className={styles.icon} />
      </button>
    </div>
  );
}

function MinusIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
    >
      <path d="M3 8h10" />
    </svg>
  );
}

function PlusIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className={className}
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
