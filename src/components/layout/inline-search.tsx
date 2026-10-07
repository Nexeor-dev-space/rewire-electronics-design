"use client";

import { forwardRef } from "react";
import { searchCopy } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * InlineSearch — the persistent, centered search field in the top bar.
 *
 * From `md` this is the site's search input: the shopper types here and
 * `SearchPanel` opens beneath the bar with the suggestions only, so there
 * is never a second field. The query lives in the header, shared with the
 * panel. Enter submits to the full results page.
 *
 * The ref is passed up so the header can hand it to `SearchPanel` as
 * the anchor for outside-click detection and focus restoration.
 */

interface InlineSearchProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onSubmit: () => void;
  ariaExpanded: boolean;
  ariaControls: string;
  className?: string;
  /** Grows the field on wider viewports where there's air to spare. */
  size?: "compact" | "wide";
}

export const InlineSearch = forwardRef<HTMLInputElement, InlineSearchProps>(
  function InlineSearch(
    { value, onChange, onFocus, onSubmit, ariaExpanded, ariaControls, className, size = "wide" },
    ref,
  ) {
    return (
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className={cn("relative w-full", className)}
      >
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
          aria-label={searchCopy.label}
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={searchCopy.placeholder}
          value={value}
          onFocus={onFocus}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "block w-full rounded-full border border-line-strong bg-surface pl-11 pr-16 text-ink",
            "placeholder:text-ink-muted",
            "transition-[background-color,border-color] duration-(--duration-fast)",
            "hover:border-ink-muted focus:border-[#94b2f3] focus:outline-none",
            "[&::-webkit-search-cancel-button]:appearance-none",
            size === "wide" ? "h-11 text-[0.9375rem]" : "h-10 text-[0.875rem]",
          )}
        />

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted transition-colors duration-(--duration-fast) hover:text-accent"
          >
            Clear
          </button>
        )}
      </form>
    );
  },
);
