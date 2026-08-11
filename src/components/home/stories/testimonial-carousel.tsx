"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import type { Testimonial } from "@/lib/testimonials";
import { cn } from "@/lib/utils";

/**
 * TestimonialCarousel — a scroll track, not a slider widget.
 *
 * The transport is native `overflow-x` with scroll snapping, which buys
 * real swipe momentum on touch, keeps the region keyboard-scrollable, and
 * makes horizontal overflow structurally impossible. The arrows only call
 * `scrollTo`; they are not a second source of truth for position, so the
 * counter stays correct however the reader moves — drag, wheel, arrow or
 * trackpad.
 *
 * How many fit is *measured*, never assumed: `perView` comes from dividing
 * the track by a card, so the breakpoints live entirely in the class list
 * and JS never needs to know about them. Paging moves by whatever is
 * currently visible and clamps to the last full row, so the final page is
 * never ragged.
 *
 * No autoplay, by request — and the controls disappear entirely when the
 * collection already fits, which is what makes three reviews and fifty
 * reviews the same component.
 */
export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);
  const prefersReducedMotion = useReducedMotion();

  const readPosition = useCallback(() => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const width = card.offsetWidth || 1;
    setPerView(Math.max(1, Math.round(track.clientWidth / width)));
    setIndex(Math.round(track.scrollLeft / width));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    readPosition();
    // Re-measure on resize rather than on a breakpoint list — the card
    // width is the single source of truth for how many are on screen.
    const observer = new ResizeObserver(readPosition);
    observer.observe(track);
    return () => observer.disconnect();
  }, [readPosition]);

  const page = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      const card = track?.firstElementChild as HTMLElement | null;
      if (!track || !card) return;
      const width = card.offsetWidth || 1;
      const last = Math.max(0, items.length - perView);
      const target = Math.min(Math.max(index + direction * perView, 0), last);
      track.scrollTo({
        left: target * width,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    },
    [index, perView, items.length, prefersReducedMotion],
  );

  const navigable = items.length > perView;
  const atStart = index <= 0;
  const atEnd = index >= items.length - perView;

  return (
    <div>
      <ul
        ref={trackRef}
        onScroll={readPosition}
        tabIndex={0}
        aria-label="Customer reviews"
        className={cn(
          "no-scrollbar flex snap-x snap-mandatory overflow-x-auto",
          "border-t border-line",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        )}
      >
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex w-full shrink-0 snap-start flex-col",
              "border-r border-line last:border-r-0",
              "pb-9 pr-6 pt-8 sm:w-1/2 lg:w-1/3 lg:px-8",
            )}
          >
            <blockquote className="flex-1">
              <p className="text-[1.0625rem] font-light leading-[1.55] tracking-[-0.015em] text-ink sm:text-[1.125rem] lg:text-[1.1875rem]">
                &ldquo;{item.quote}&rdquo;
              </p>
            </blockquote>

            <div className="mt-7 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[0.9375rem] font-medium text-ink">
                {item.author}
              </span>
              {item.verified && (
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
                  Verified purchase
                </span>
              )}
            </div>

            <p className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-faint">
              {item.product} · {item.drop}
            </p>
          </li>
        ))}
      </ul>

      {/* ---------- Transport ----------
          Hidden outright when everything already fits: controls that
          cannot do anything are worse than no controls. */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-line pt-6">
        {navigable ? (
          <div className="flex items-center gap-2">
            <Arrow
              direction="prev"
              disabled={atStart}
              onClick={() => page(-1)}
            />

            <p
              aria-live="polite"
              className="min-w-[4.5rem] text-center font-mono text-xs tabular-nums tracking-[0.14em]"
            >
              <span className="text-ink">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-ink-faint"> / </span>
              <span className="text-ink-muted">
                {String(items.length).padStart(2, "0")}
              </span>
            </p>

            <Arrow direction="next" disabled={atEnd} onClick={() => page(1)} />
          </div>
        ) : (
          <span />
        )}

        <Link
          href="/reviews"
          className="group/all -my-2 inline-flex items-center gap-2.5 py-2 text-[0.9375rem] font-medium text-ink transition-colors duration-(--duration-fast) hover:text-accent"
        >
          View all reviews
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5 transition-transform duration-(--duration-fast) ease-(--ease-out-quart) group-hover/all:translate-x-1"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

/** A glyph with a 44px target around it — no circle, no fill, no chrome. */
function Arrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous reviews" : "Next reviews"}
      className={cn(
        "flex size-11 items-center justify-center rounded-full",
        "text-ink transition-colors duration-(--duration-fast)",
        "hover:bg-surface-2",
        "disabled:pointer-events-none disabled:text-ink-faint",
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("size-4", direction === "prev" && "rotate-180")}
      >
        <path d="M3 8h10M9 4l4 4-4 4" />
      </svg>
    </button>
  );
}
