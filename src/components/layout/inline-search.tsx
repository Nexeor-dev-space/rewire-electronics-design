"use client";

import { forwardRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * InlineSearch — the persistent, centered search field in the top bar.
 *
 * On desktop this is the only search field: focus opens `SearchPanel`
 * beneath the bar, typing drives its results, Enter goes to `/search`.
 * The header owns the query, so the panel shows no second field here.
 */

interface InlineSearchProps {
  value: string;
  onFocus: () => void;
  onQuery: (value: string) => void;
  onSubmit: () => void;
  ariaExpanded: boolean;
  ariaControls: string;
  className?: string;
  /** Grows the field on wider viewports where there's air to spare. */
  size?: "compact" | "wide";
}

export const InlineSearch = forwardRef<HTMLInputElement, InlineSearchProps>(
  function InlineSearch(
    { value, onFocus, onQuery, onSubmit, ariaExpanded, ariaControls, className, size = "wide" },
    ref,
  ) {
    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.key === "Enter") {
        event.preventDefault();
        onSubmit();
        return;
      }
      if (event.key === "ArrowDown") onFocus();
    }

    return (
      <div className={cn("relative w-full", className)}>
        {/* Magnifier — decorative, the label lives on the input. */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>

        <input
          ref={ref}
          type="search"
          role="combobox"
          aria-label="Search products, brands and devices"
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search products, brands & devices"
          value={value}
          onFocus={onFocus}
          onClick={onFocus}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "block w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-ink",
            "placeholder:text-ink-muted",
            "transition-[background-color,border-color] duration-(--duration-fast)",
            "hover:border-ink-muted focus:border-[#94b2f3] focus:outline-none",
            size === "wide" ? "h-11 text-[0.9375rem]" : "h-10 text-[0.875rem]",
          )}
        />
      </div>
    );
  },
);
