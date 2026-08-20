"use client";

import { useId } from "react";
import { sortOptions, type SortId } from "@/lib/shop";
import { cn } from "@/lib/utils";

/**
 * SortSelect — a native `<select>` wearing the site's pill.
 *
 * Deliberately not a custom listbox. Sorting is a four-option, low-stakes
 * control that every platform already renders well; a hand-built menu
 * would buy nothing here and cost keyboard support, the mobile wheel, and
 * screen-reader behaviour that works without being asked to.
 *
 * The chevron and the border are ours; the popup belongs to the OS.
 */
export function SortSelect({
  value,
  onChange,
  className,
}: {
  value: SortId;
  onChange: (value: SortId) => void;
  className?: string;
}) {
  const id = useId();

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        Sort products by
      </label>

      {/* The visible prefix. Inside the control rather than above it, so
          the row reads as one object at every width. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted"
      >
        Sort
      </span>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as SortId)}
        className={cn(
          "h-10 w-full cursor-pointer appearance-none rounded-full",
          "border border-line bg-surface pl-[3.75rem] pr-10",
          "text-[0.8125rem] font-medium tracking-tight text-ink",
          "transition-colors duration-(--duration-fast) ease-(--ease-out-quart)",
          "hover:border-line-strong focus:border-line-strong focus:outline-none",
        )}
      >
        {sortOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute right-4 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted"
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </div>
  );
}
