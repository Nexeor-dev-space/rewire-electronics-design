"use client";

import { forwardRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * InlineSearch — the persistent, centered search field in the top bar.
 *
 * Acts as the visible entry point for the site's real search overlay
 * (`SearchPanel`). The field itself does no work — focus, typing or
 * Enter open the overlay, which then owns the actual query, results
 * and navigation. Rendering the field inline (rather than a magnifier
 * icon) makes "search the catalogue" the primary interaction the top
 * bar advertises, exactly as premium e-commerce chrome should.
 *
 * The ref is passed up so the header can hand it to `SearchPanel` as
 * the anchor for outside-click detection and focus restoration.
 */

interface InlineSearchProps {
  onFocus: () => void;
  onQuery: (value: string) => void;
  ariaExpanded: boolean;
  ariaControls: string;
  className?: string;
  /** Grows the field on wider viewports where there's air to spare. */
  size?: "compact" | "wide";
}

export const InlineSearch = forwardRef<HTMLInputElement, InlineSearchProps>(
  function InlineSearch(
    { onFocus, onQuery, ariaExpanded, ariaControls, className, size = "wide" },
    ref,
  ) {
    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      // Enter, arrow-down and typed characters all funnel into the overlay,
      // where the real input takes over and the header field just reads
      // the last term for accessibility.
      if (
        event.key === "Enter" ||
        event.key === "ArrowDown" ||
        (event.key.length === 1 && !event.metaKey && !event.ctrlKey)
      ) {
        onFocus();
      }
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
          onFocus={onFocus}
          // The overlay owns the query. Keystrokes still bubble up so the
          // shopper's first character isn't lost in the transition.
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
