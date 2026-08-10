"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LiveDrop, LiveDropDevice } from "@/lib/drops";
import { cn, pad } from "@/lib/utils";
import { useCountdown } from "@/hooks/use-countdown";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { PriceBlock } from "./price-block";

interface LiveDropPanelProps {
  drop: LiveDrop;
  /** The device on the plinth — the panel reads whatever is shown. */
  device: LiveDropDevice;
  /** Zero-based, mirrored from the nav caption under the product. */
  index: number;
  total: number;
  /** Which way the carousel just moved, so the ledger enters from it. */
  direction: number;
  /** Rotation pauses while the pointer is over the panel (WCAG 2.2.2). */
  onPause: () => void;
  onResume: () => void;
  className?: string;
}

/**
 * LiveDropPanel — the drop's ledger for the device in front of you.
 *
 * Three jobs, in order of how the eye should hit them:
 *
 * 1. **Belong to the carousel.** The panel is not a spec sheet parked
 *    beside a photograph — it opens on the same `01 — 04` the nav caption
 *    carries and closes on a control that moves the carousel on. Both ends
 *    are wired to the same index, so the column reads as this device's
 *    ledger rather than as generic chrome.
 *
 * 2. **Make the shortage felt.** The remaining count is set at display
 *    scale, because a 17px "Only 5 left" is a spec and a 52px 5 is a
 *    warning. Under it sits the one number that conveys *rate* rather than
 *    level — how many went in the last day. Level tells you the shelf is
 *    thin; rate tells you it is emptying while you read, which is the
 *    actual reason to act now.
 *
 * 3. **Close the loop.** The panel ends on the selected device's own way
 *    in, so the column that argued for it is also the column you act from
 *    — quieter than the left-hand CTA on purpose, because two equal
 *    buttons to the same place is a question, not an offer.
 *
 * Still no auction, no badges and no exclamation marks. The urgency is
 * carried by scale and by numbers that happen to be alarming, which is the
 * only kind of urgency a premium brand can use twice.
 */
export function LiveDropPanel({
  drop,
  device,
  index,
  total,
  direction,
  onPause,
  onResume,
  className,
}: LiveDropPanelProps) {
  const claimed = device.unitsTotal - device.unitsLeft;
  const claimedRatio = claimed / device.unitsTotal;

  return (
    <aside
      aria-label="Live drop availability"
      onPointerEnter={onPause}
      onPointerLeave={onResume}
      className={cn(
        // No max-width of its own: the grid column already bounds this at
        // every size, and a 384px cap left the card 6px narrower than the
        // CTA beneath it on a 430px phone — a misalignment with no cause.
        "w-full",
        // Tablet only. There the panel sits in its own column beside the
        // CTA, so a plate is what stops it reading as a loose column of
        // hairlines. On a phone it is the middle of one continuous
        // purchase block — price above, buttons below — and boxing it
        // there would break the block into "text, card, buttons" for no
        // gain. Hairlines carry it instead; the house rule is borders
        // first, and a hero with three cards in it has too many.
        "md:max-lg:rounded-2xl md:max-lg:border md:max-lg:border-line md:max-lg:bg-surface md:max-lg:p-5 md:max-lg:shadow-(--shadow-soft)",
        className,
      )}
    >
      {/* ---------- Status · the same index the nav caption shows ---------- */}
      <div className="flex items-center justify-between gap-4 border-t border-line pt-5 max-md:pt-4 md:max-lg:border-t-0 md:max-lg:pt-0">
        <span className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase leading-none tracking-[0.22em] text-ink">
          {/* Urgent rather than the site's green `live`: green reads
              "certified, all is well", and this dot says the opposite. */}
          <span
            aria-hidden
            className="size-1.5 shrink-0 animate-pulse-dot rounded-full bg-urgent"
          />
          Live drop
        </span>
        <span
          aria-hidden
          className="font-mono text-[0.6875rem] uppercase leading-none tabular-nums tracking-[0.16em] text-ink-faint"
        >
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>

      {/* Keyed on the device so the whole ledger re-enters — and the bar
          re-runs — each time the plinth turns over. */}
      <motion.div
        key={device.id}
        initial={{ opacity: 0, x: 14 * direction }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      >
        {/* Hidden below `lg`: the identity lives directly under the
            carousel controls at those sizes, where the tap happens, so
            repeating it here would name the device twice on one screen.
            From `lg` this row is the only place the device is named. */}
        <div className="mt-4 max-lg:hidden">
          <p className="text-[1.0625rem] font-medium leading-tight tracking-[-0.01em] text-ink">
            {device.name}
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-ink-secondary">
            {device.variant}
          </p>
        </div>

        {/* ---------- What it costs ----------
            Above the stock, and the only display figure in the column.
            The count used to hold that slot at 3.25rem; with a price in
            play two competing display numbers would just split the eye,
            so the count steps down and the price takes the rank. */}
        <PriceBlock
          price={device.price}
          originalPrice={device.originalPrice}
          currency={drop.currency}
          locale={drop.locale}
          scale="panel"
          // Hidden below `lg`: the identity block under the carousel
          // already states the price above the CTA at those sizes, and
          // printing the same money twice on one screen invites the reader
          // to check whether the two figures agree.
          className="mt-4 border-t border-line pt-5 max-lg:hidden"
        />

        {/* ---------- What is left ---------- */}
        <div className="mt-4 border-t border-line pt-5 max-lg:mt-4 max-lg:pt-4 max-md:mt-3 max-md:pt-3">
          {/* The orange count says "available now" on its own; on a phone
              the label was a row of type earning nothing. */}
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-muted max-lg:hidden">
            Available now
          </p>

          {/* Display scale, baseline-aligned so the phrase hangs off the
              numeral rather than floating beside it. "units remaining"
              rather than "left": the panel now carries two device names,
              and a bare "left" invited the count to be read against the
              wrong one. */}
          {/* On a phone the denominator sits on the count's baseline
              rather than under it — a 335px column has the width for it,
              and it saves a whole row without shrinking the number. */}
          <div className="max-lg:flex max-lg:flex-wrap max-lg:items-baseline max-lg:justify-between max-lg:gap-x-3">
            <p className="mt-2 flex items-baseline gap-2 text-urgent max-lg:mt-0">
              <span className="text-[1.75rem] font-light leading-[0.85] tracking-[-0.035em] tabular-nums">
                {device.unitsLeft}
              </span>
              <span className="text-[1rem] font-light tracking-[-0.02em]">
                units remaining
              </span>
            </p>
            <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted max-lg:mt-0">
              of {device.unitsTotal} devices
            </p>
          </div>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={device.unitsTotal}
            aria-valuenow={claimed}
            aria-label={`${claimed} of ${device.unitsTotal} ${device.name} devices claimed`}
            className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-line-strong max-lg:mt-4 max-md:mt-3"
          >
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: claimedRatio }}
              transition={{
                duration: DURATION.cinematic,
                ease: EASE_OUT_EXPO,
                delay: 0.2,
              }}
              className="block h-full origin-left rounded-full bg-urgent"
            />
          </div>

          {/* Rate, not level — the line that makes the shelf feel like it
              is still emptying. */}
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-ink max-md:mt-3">
            <span className="font-medium">
              {device.claimedRecently} claimed
            </span>{" "}
            in the last 24 hours.
          </p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-secondary">
            No restock planned.
          </p>
        </div>

        {/* ---------- Close ---------- */}
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4 max-lg:mt-4 max-lg:pt-4 max-md:mt-3 max-md:pt-3">
          <span className="font-mono text-[0.6875rem] uppercase leading-none tracking-[0.16em] text-ink-muted">
            Closes in
          </span>
          <DropClock target={drop.endsAt} label={`${drop.title} closes in`} />
        </div>

        {/* ---------- The panel's own way in ----------
            Deliberately an outline, not a second ink fill: "Grab It Now"
            is the primary and this goes to the same place, so making them
            look equally weighted would turn one decision into two. It
            earns its place by being *here* — at the end of the argument
            that just convinced you, and unambiguously about the device the
            panel is describing rather than whatever the page defaults to. */}
        <Link
          href={`/drops/${drop.slug}`}
          aria-label={`View and shop ${device.name}`}
          className={cn(
            // Below `lg` the card is purely informational and stops at the
            // countdown: every action lives in the CTA block, which now
            // sits above this card on phones and directly beside it on
            // tablet. Two buttons to the same place within one screen is
            // an ambiguity, not an offer. From `lg` the CTA is a column
            // away and this earns its place.
            "group/shop mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full max-lg:hidden",
            "border border-ink text-[0.8125rem] font-medium tracking-tight text-ink",
            "transition-colors duration-(--duration-fast) ease-(--ease-out-quart)",
            "hover:bg-ink hover:text-surface focus-visible:bg-ink focus-visible:text-surface",
            "max-lg:mt-5",
          )}
        >
          View &amp; Shop
          <svg
            aria-hidden
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "size-3 transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
              "motion-safe:group-hover/shop:translate-x-1",
              "motion-safe:group-focus-visible/shop:translate-x-1",
            )}
          >
            <path d="M1.5 7h11M8.5 3.5L12 7l-3.5 3.5" />
          </svg>
        </Link>
      </motion.div>
    </aside>
  );
}

/**
 * The shared `Countdown` renders `02:08:38:08`, which on a multi-day drop
 * reads as hours:minutes:seconds — the wrong number by two orders of
 * magnitude. Units are spelled out here instead, and seconds are dropped:
 * a five-day window does not need a ticking second hand, and a flickering
 * digit is exactly the discount-sale cue the drop is avoiding.
 */
function DropClock({ target, label }: { target: string; label: string }) {
  const { days, hours, minutes, isComplete } = useCountdown(target);

  return (
    <time
      aria-label={label}
      className="font-mono text-[0.8125rem] tabular-nums tracking-wider text-ink"
    >
      {isComplete ? "Closed" : `${days}d ${pad(hours)}h ${pad(minutes)}m`}
    </time>
  );
}
