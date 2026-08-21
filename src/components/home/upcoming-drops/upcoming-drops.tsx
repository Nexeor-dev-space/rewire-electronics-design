"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getUpcomingDrops, type UpcomingDrop } from "@/lib/drops";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { resolveWaitlistPreselect } from "@/lib/waitlist";
import { buttonVariants } from "@/components/ui/button";
import { WaitlistModal } from "@/components/home/hero/waitlist-modal";
import { DropCard } from "./drop-card";
import { cn } from "@/lib/utils";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

const lineClip = {
  hidden: { y: "140%" },
  visible: { y: "0%", transition: { duration: 1, ease: EASE_OUT_EXPO } },
};

/**
 * Section 02 — Upcoming Drops.
 *
 * The release calendar, read as a shopping decision: an oversized
 * statement, then four plates that each answer what it is, what it
 * costs, what that saves, whether any are left, and what to do — with
 * nothing important hidden behind a hover.
 *
 * The unbuyable states (upcoming, sold out) share one waitlist dialog
 * owned here rather than one per card, so four cards cannot mount four
 * modals. The dialog still opens *for the card that was clicked*: state
 * holds the drop itself rather than a bare boolean, and its name +
 * variant resolve to the waitlist catalogue's `preselect` pair so the
 * modal opens straight to email/phone instead of asking the shopper to
 * pick, from a dropdown, the exact device they just clicked "Join
 * Waitlist" on.
 */
export function UpcomingDrops() {
  const drops = getUpcomingDrops();
  const [waitlistDrop, setWaitlistDrop] = useState<UpcomingDrop | null>(null);
  const preselect = waitlistDrop
    ? resolveWaitlistPreselect(waitlistDrop.name, waitlistDrop.variant)
    : undefined;

  return (
    <section
      aria-labelledby="upcoming-drops-heading"
      // Same closing rhythm as `standard.tsx`: the section carries the
      // page's top spacing, plus a shorter foot so the trailing CTA is not
      // left flush against the section edge.
      className="relative overflow-hidden pt-(--spacing-section) pb-14 lg:pb-16"
    >
      {/* Background depth — soft lighting, no clutter */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-void)_0%,var(--color-surface-2)_45%,var(--color-void)_100%)]"
      />
      {/* Warm ember behind the calendar — burnt-orange at low alpha lifts
          the middle of the section without the cool steel-blue reading as
          a light-theme leftover on the graphite ground. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[18%] size-[46rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(194_65_12/0.10),transparent_72%)] blur-2xl"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- Section header ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
        >
          {/* Quiet context line: what this section is, and how much of
              it there is. Mono and muted so it never competes with the
              statement underneath. */}
          <motion.p
            variants={rise}
            className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-muted"
          >
            Upcoming drops
            <span aria-hidden className="mx-2.5 text-ink-faint">
              ·
            </span>
            {String(drops.length).padStart(2, "0")} products
          </motion.p>

          <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
            <h2
              id="upcoming-drops-heading"
              className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink lg:col-span-7"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Upcoming
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  drops.
                </motion.span>
              </span>
            </h2>

            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
            >
              Discover our next exclusive releases. Every device is
              professionally tested, certified, and available only during
              limited-time product drops.
            </motion.p>
          </div>
        </motion.div>

        {/* ---------- Drop plates ---------- */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.14, 0.1)}
          className={cn(
            "mt-16 lg:mt-20",
            // Phones read the calendar one release at a time: a full-width
            // plate per drop, stacked. Nothing is cropped at the edge and
            // no horizontal gesture is required to reach the fourth.
            "grid grid-cols-1 gap-y-12",
            // Tablet: two up. Desktop: the full calendar.
            "sm:grid-cols-2 sm:gap-x-6 sm:gap-y-14",
            "xl:grid-cols-4",
          )}
        >
          {drops.map((drop, i) => (
            <motion.li
              key={drop.id}
              variants={rise}
              className="flex h-full w-full"
            >
              <DropCard
                drop={drop}
                priority={i === 0}
                onJoinWaitlist={() => setWaitlistDrop(drop)}
              />
            </motion.li>
          ))}
        </motion.ul>

        {/* ---------- Section footer ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mt-20 flex justify-center lg:mt-24"
        >
          {/* Secondary to the cards' own actions, deliberately: buying one
              of these is the section's job, and browsing the rest is the
              fallback. Sized below the product CTAs so it cannot outweigh
              them. */}
          <Link
            href={SHOP_INDEX_HREF}
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            View all upcoming drops
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </motion.div>
      </div>

      {/* Section-shared modal, per-card content: `preselect` is derived
          from whichever drop set `waitlistDrop`, so the dialog always
          matches the card that opened it. `undefined` only if a future
          catalogue entry drifts out of sync with `lib/waitlist.ts` (see
          `resolveWaitlistPreselect`) — the modal degrades to its general
          form rather than preselecting the wrong device. */}
      <WaitlistModal
        open={!!waitlistDrop}
        onClose={() => setWaitlistDrop(null)}
        preselect={preselect}
      />
    </section>
  );
}
