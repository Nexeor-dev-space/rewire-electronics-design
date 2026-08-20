"use client";

import Image from "next/image";
import Link from "next/link";
import type { DropStatus, UpcomingDrop } from "@/lib/drops";
import { productHrefForDrop } from "@/lib/route-map";
import { cn, formatPrice, savingsPercent } from "@/lib/utils";
import { Countdown } from "@/components/ui/countdown";

interface DropCardProps {
  drop: UpcomingDrop;
  /** First card above the fold gets eager loading. */
  priority?: boolean;
  /** Opens the section's waitlist dialog — used by the unbuyable states. */
  onJoinWaitlist: () => void;
}

/**
 * One row per state. `action` decides who the card sends the reader to;
 * the chip and the bottom-of-image fact both key off the same enum so
 * treatment is decided in one place rather than scattered through the
 * markup.
 */
const STATES: Record<
  DropStatus,
  {
    cta: string;
    action: "view" | "waitlist";
    dot: boolean;
    /** Low stock — the one place the urgent tone is allowed. */
    urgent: boolean;
    muted: boolean;
  }
> = {
  available: {
    cta: "View Product",
    action: "view",
    dot: true,
    urgent: false,
    muted: false,
  },
  "coming-soon": {
    cta: "Join Waitlist",
    action: "waitlist",
    // No dot on upcoming — the countdown overlay carries the sense of
    // activity, and a static dot beside a ticking clock reads as noise.
    dot: false,
    urgent: false,
    muted: false,
  },
  "almost-gone": {
    cta: "View Product",
    action: "view",
    dot: true,
    urgent: true,
    muted: false,
  },
  "sold-out": {
    cta: "Join Waitlist",
    action: "waitlist",
    dot: false,
    urgent: false,
    muted: true,
  },
};

/**
 * The chip's label — the state as a name. The bottom-of-image overlay
 * carries the *fact* (count / clock / SOLD OUT), so this line does not
 * need to. Split cleanly and neither element has to do both jobs.
 */
function chipLabel(drop: UpcomingDrop): string {
  switch (drop.status) {
    case "available":
      return "Available now";
    case "coming-soon":
      return "Upcoming drop";
    case "almost-gone":
      return "Almost sold out";
    case "sold-out":
      return "Sold out";
  }
}

function Arrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-3.5 shrink-0",
        // 5px shift — inside the brief's 4–6px range and consistent
        // with the `View device →` links elsewhere on the page.
        "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
        "group-hover:translate-x-[5px] group-focus-within:translate-x-[5px]",
        "motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-within:translate-x-0",
      )}
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/**
 * DropCard — a launch plate in four decisive stops.
 *
 * The whole dynamic story rides on the image now: status at the top
 * corner, the live fact (count · clock · SOLD OUT) at the bottom
 * corner. That freed the block below to be pure product identity — one
 * horizontal header row of name + text CTA, the variant on the next
 * line, and the price stack under that. No bottom action row, no rule,
 * no reserved slack. Same information as before, shorter card, cleaner
 * hierarchy.
 *
 * The AED-saving line was already at the Savings section further down
 * the page — repeating it inside every calendar card had put the two
 * sections in competition. One saving, one place.
 *
 * Reading order: name + CTA → variant → price → struck original + % off.
 * Everything a shopper needs to decide, in the order they ask the
 * questions.
 */
export function DropCard({ drop, priority, onJoinWaitlist }: DropCardProps) {
  const state = STATES[drop.status];
  const isSoldOut = drop.status === "sold-out";
  const saving = savingsPercent(drop.price, drop.originalPrice);

  const ctaClass = cn(
    "inline-flex shrink-0 items-center gap-1.5 text-[0.8125rem] font-medium",
    "text-ink transition-colors duration-(--duration-fast)",
    "hover:text-ink-hover focus-visible:text-ink-hover",
    // Invisible tap padding: the text stays 13px, the target becomes ~36px.
    "-my-2 py-2",
  );

  return (
    <article className="group relative flex h-full w-full flex-col">
      {/* ---------- The photograph ---------- */}
      <div className="relative aspect-3/4 overflow-hidden rounded-xl bg-surface">
        <Image
          src={drop.image.url}
          alt={drop.image.alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 86vw, (max-width: 1280px) 46vw, 24vw"
          className={cn(
            "object-cover",
            // Zooms from anywhere on the card — the whole plate is one
            // link, so it behaves like one. Slight lift alongside the
            // scale is the "premium hover" the brief asks for; both
            // stay inside the 1.03–1.05 range at 400ms easing.
            "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
            "group-hover:-translate-y-1 group-hover:scale-[1.04]",
            "group-focus-within:-translate-y-1 group-focus-within:scale-[1.04]",
            "motion-reduce:group-hover:scale-100 motion-reduce:group-hover:translate-y-0",
            "motion-reduce:group-focus-within:scale-100 motion-reduce:group-focus-within:translate-y-0",
          )}
        />

        {/* Status chip — top-left, where a scanning eye lands first.
            `glass-strong` on ivory keeps the label readable over any
            photograph without becoming a badge. */}
        <span
          className={cn(
            "glass-strong absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5",
            "font-mono text-[0.6875rem] uppercase tracking-[0.14em]",
            state.urgent ? "text-urgent" : "text-ink",
            state.muted && "text-ink-muted",
          )}
        >
          {state.dot && (
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                state.urgent ? "bg-urgent animate-pulse-dot" : "bg-accent",
              )}
            />
          )}
          {chipLabel(drop)}
        </span>

        {/* Bottom-of-image fact — one line per state. This is what
            replaced the bottom row of the card: the *fact* about
            availability belongs *on* the product, not stacked as a
            second row of metadata below it. Same `glass-strong`
            material as the chip above so the two read as a set. */}
        <UrgencyOverlay drop={drop} state={state} />

        {/* Sold out earns the strongest treatment available without a
            badge: the photograph itself steps down. Softer than the
            previous 45% ivory + hard grayscale — the brief was
            specific about not making sold-out cards look dead. */}
        {isSoldOut && (
          <span
            aria-hidden
            className="absolute inset-0 bg-void/20 grayscale-[85%]"
          />
        )}
      </div>

      {/* ---------- Identity and action ----------
          Header row: name on the left, text CTA on the right. Sharing a
          line pulls the action next to the thing it acts on, which is
          the whole point of consolidating the old bottom row into this
          spot. `items-baseline` keeps the small CTA sitting on the
          name's baseline; `shrink-0` on the CTA holds it upright even
          when the name eats the row. */}
      <div className="flex flex-1 flex-col px-1 pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[1.25rem] font-medium leading-tight tracking-[-0.02em] text-ink">
            <Link
              href={productHrefForDrop(drop.slug)}
              // Whole plate is one link (see the `after:inset-0`).
              // Actions that need to open the modal live above it on
              // `z-10`.
              className="after:absolute after:inset-0 after:content-['']"
            >
              {drop.name}
            </Link>
          </h3>

          {state.action === "view" ? (
            <Link
              href={productHrefForDrop(drop.slug)}
              className={ctaClass}
              aria-label={`${state.cta} — ${drop.name}`}
            >
              {state.cta}
              <Arrow />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onJoinWaitlist}
              aria-haspopup="dialog"
              aria-label={`${state.cta} — ${drop.name}`}
              className={cn(ctaClass, "relative z-10")}
            >
              {state.cta}
              <Arrow />
            </button>
          )}
        </div>

        <p className="mt-1.5 truncate text-sm text-ink-muted">{drop.variant}</p>

        {/* ---------- What it costs ----------
            The strongest figure below the name. Sold-out drops go to
            `-ink-muted` because urgent orange on an unbuyable device
            signals "buy me". */}
        <div className="mt-5">
          <p
            className={cn(
              "font-sans text-[2rem] font-light leading-none tracking-[-0.035em] tabular-nums",
              isSoldOut ? "text-ink-muted" : "text-urgent",
            )}
          >
            {formatPrice(drop.price, drop.currency, drop.locale)}
          </p>

          {!isSoldOut && (
            <p className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-[0.75rem] tabular-nums">
              <span className="sr-only">Was </span>
              <s className="text-ink-muted">
                {formatPrice(drop.originalPrice, drop.currency, drop.locale)}
              </s>
              {saving > 0 && (
                <span className="font-medium uppercase tracking-[0.14em] text-urgent">
                  {saving}% off
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * The line at the bottom of the image. One label per state, mono
 * uppercase, small — reads as metadata belonging to the photograph
 * rather than as a second banner sitting on it.
 *
 * `glass-strong` for its own quiet frost; the same `shadow-soft` the
 * archive pills carry, so the two systems read as one badge family.
 * The status chip at the top stays flat on purpose — the shadow
 * belongs to the *live* fact, not the label above it.
 *
 * Kept at bottom-left rather than centred: centring puts the pill in
 * the same optical column as whichever product silhouette sits mid-
 * frame, which reads as an accidental stamp on the product. A corner
 * position is unambiguous chrome.
 */
function UrgencyOverlay({
  drop,
  state,
}: {
  drop: UpcomingDrop;
  state: (typeof STATES)[DropStatus];
}) {
  const shell = cn(
    "glass-strong absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5",
    "font-mono text-[0.6875rem] uppercase leading-none tracking-[0.14em]",
    "shadow-(--shadow-soft)",
    state.urgent ? "text-urgent" : "text-ink",
    state.muted && "text-ink-muted",
  );

  switch (drop.status) {
    case "available":
    case "almost-gone":
      return <span className={shell}>{drop.unitsLeft} units left</span>;
    case "coming-soon":
      return (
        <span className={shell}>
          <span className="text-ink-muted">Opens in</span>
          <Countdown
            compact
            target={drop.startsAt}
            label={`${drop.name} drop opens in`}
            className="text-[0.6875rem] leading-none normal-case tracking-[0.06em] text-ink"
          />
        </span>
      );
    case "sold-out":
      return <span className={shell}>Sold out</span>;
  }
}
