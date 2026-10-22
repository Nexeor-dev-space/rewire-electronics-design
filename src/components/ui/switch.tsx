"use client";

import { cn } from "@/lib/utils";

/**
 * Switch — an on/off control that takes effect straight away, such as a
 * section's visibility. A checkbox stays the right control inside a form
 * that saves on submit.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The accessible name; the visible text beside it is optional. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full",
        "transition-colors duration-(--duration-fast) ease-(--ease-out-quart)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-ink" : "bg-line-strong",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-4 rounded-full bg-void shadow-sm",
          "transition-transform duration-(--duration-fast) ease-(--ease-out-quart)",
          checked ? "translate-x-4.5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
