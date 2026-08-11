"use client";

import { cn, pad } from "@/lib/utils";

interface ProductNavProps {
  total: number;
  /** Zero-based index of the device on the plinth. */
  index: number;
  onPrev: () => void;
  onNext: () => void;
  /** Opens the full drop list. Rendered from `md` — phones get their own
   *  trigger under the CTAs, where the thumb already is. */
  onViewAll: () => void;
  className?: string;
}

/**
 * ProductNav — the way through the drop, set as a caption rather than a
 * control bar.
 *
 * Two hairline circles and a mono counter, no larger than the eyebrow type
 * above them: at rest it reads as part of the composition, and only
 * resolves into something clickable when the pointer arrives. That is the
 * whole brief — a slider chrome under a keynote product would announce
 * "carousel" and cost the frame its stillness.
 *
 * The one flourish is inside the circle: the arrow leaves and its
 * replacement arrives from the opposite edge, clipped by the button, so
 * the affordance moves in the direction it will take you. Under reduced
 * motion the first arrow simply stays put and nothing slides.
 */
export function ProductNav({
  total,
  index,
  onPrev,
  onNext,
  onViewAll,
  className,
}: ProductNavProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3.5", className)}>
      <div
        role="group"
        aria-label="Featured devices in this drop"
        // Tighter gaps than they look: each button carries 4px of invisible
        // target around its circle, so gap-3 reads as 16px of air.
        className="flex items-center justify-center gap-3 sm:gap-4"
      >
        <NavButton direction="prev" onClick={onPrev} />

        {/* Decorative: the buttons carry the accessible labels and the
            identity beneath already names the device. */}
        <p
          aria-hidden
          className="flex items-baseline gap-1.5 font-mono text-[0.6875rem] uppercase tabular-nums tracking-[0.22em]"
        >
          <span className="text-ink">{pad(index + 1)}</span>
          <span className="text-ink-faint">/</span>
          <span className="text-ink-faint">{pad(total)}</span>
        </p>

        <NavButton direction="next" onClick={onNext} />
      </div>

      {/* Two circles and a fraction say "there are others" only to someone
          already looking for them. This says it in words — and it is the
          only way to see the whole drop at once, which the arrows cannot
          do without four taps and a memory test. Phones carry their own
          copy of this under the CTAs. */}
      <button
        type="button"
        onClick={onViewAll}
        className="group/all -my-2 hidden items-center gap-1.5 py-2 text-[0.8125rem] font-medium text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink focus-visible:text-ink md:inline-flex"
      >
        <span className="relative">
          View all drops
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-current",
              "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
              "group-hover/all:origin-left group-hover/all:scale-x-100",
              "group-focus-visible/all:origin-left group-focus-visible/all:scale-x-100",
            )}
          />
        </span>
        <Arrow
          next
          className={cn(
            "size-3 transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
            "motion-safe:group-hover/all:translate-x-1",
            "motion-safe:group-focus-visible/all:translate-x-1",
          )}
        />
      </button>
    </div>
  );
}

function NavButton({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const next = direction === "next";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={next ? "Next device" : "Previous device"}
      // The hit area is the 44px button; the hairline circle inside it is
      // the 36px the composition wants. Nesting them rather than padding
      // one element keeps the target honest — 36px clears the 24px AA
      // floor but is mean under a thumb.
      className="group/arrow flex size-11 shrink-0 items-center justify-center rounded-full"
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          "border border-line text-ink-secondary",
          "transition-[border-color,color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
          "group-hover/arrow:border-ink group-hover/arrow:text-ink",
          "group-focus-visible/arrow:border-ink group-focus-visible/arrow:text-ink",
          "group-active/arrow:scale-[0.96]",
        )}
      >
        {/* The clip that makes the swap read as one arrow replacing another
            rather than two arrows crossfading. */}
        <span aria-hidden className="relative block size-3.5 overflow-hidden">
        <Arrow
          next={next}
          className={cn(
            "absolute inset-0 transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
            next
              ? "motion-safe:group-hover/arrow:translate-x-full motion-safe:group-focus-visible/arrow:translate-x-full"
              : "motion-safe:group-hover/arrow:-translate-x-full motion-safe:group-focus-visible/arrow:-translate-x-full",
          )}
        />
        <Arrow
          next={next}
          className={cn(
            "absolute inset-0 transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
            next ? "-translate-x-full" : "translate-x-full",
            "motion-safe:group-hover/arrow:translate-x-0 motion-safe:group-focus-visible/arrow:translate-x-0",
          )}
        />
        </span>
      </span>
    </button>
  );
}

/** A rule with a chevron on it — geometry, not an icon-set glyph. */
function Arrow({ next, className }: { next: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-3.5", className)}
    >
      {next ? (
        <path d="M1.5 7h11M8.5 3.5L12 7l-3.5 3.5" />
      ) : (
        <path d="M12.5 7h-11M5.5 3.5L2 7l3.5 3.5" />
      )}
    </svg>
  );
}
