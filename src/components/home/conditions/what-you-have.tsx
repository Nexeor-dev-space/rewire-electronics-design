"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

/**
 * What you have — the condition vocabulary as an editorial legend.
 *
 * Replaces the "Up to X% less than new" savings shelf. Reasoning: the
 * page already carries the price argument on the drop cards and in the
 * kit. What it lacks — and what the brief calls for — is one place that
 * defines the words attached to every listing so a shopper never
 * wonders what "Refurbished" means here versus what a marketplace
 * listing meant by the same word.
 *
 * Three items, split by status. Refurbished and Used are explicitly
 * defined in the current PRD and get the accent dot. Pre-Owned is on
 * the roadmap but not yet formally defined; it carries a neutral dot
 * and honest copy ("Not specified in the PRD") so the section reads as
 * a scoped commitment rather than as a broken feature. (New and Just
 * Opened were removed from the legend at the client's request.)
 *
 * Layout: one equal 3-across row at `lg`, 2 across at `sm` with the
 * last item spanning the row, single column on phones.
 * Nothing here is a card of a card — each tile is a light-touch panel
 * with a hairline border, a status dot, a symbol, the term, one line
 * of copy, and a hairline arrow that shifts on hover.
 */

type Status = "defined" | "unspecified";

interface ConditionItem {
  id: string;
  name: string;
  status: Status;
  /** One-line status label — verbatim wording the brief hands us. */
  label: string;
  href: string;
  icon: ReactNode;
}

const CONDITIONS: ConditionItem[] = [
  {
    id: "refurbished",
    name: "Refurbished",
    status: "defined",
    label: "Explicitly defined as a product condition",
    href: "/shop?condition=refurbished",
    icon: <IconCycle />,
  },
  {
    id: "used",
    name: "Used",
    status: "defined",
    label: "Explicitly defined as a product condition",
    href: "/shop?condition=used",
    icon: <IconClock />,
  },
  {
    id: "pre-owned",
    name: "Pre-Owned",
    status: "unspecified",
    label: "Not specified in the PRD",
    href: "/shop?condition=pre-owned",
    icon: <IconPerson />,
  },
];

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

const lineClip: Variants = {
  hidden: { y: "140%" },
  visible: { y: "0%", transition: { duration: 1, ease: EASE_OUT_EXPO } },
};

const tileRise: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO },
  },
};

export function WhatYouHave() {
  return (
    <section
      aria-labelledby="what-you-have-heading"
      className="relative overflow-hidden bg-surface-2 py-(--spacing-section-sm)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- Section header ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.08)}
          className="grid gap-6 lg:grid-cols-12 lg:items-end"
        >
          <motion.div variants={rise} className="lg:col-span-7">
            <p className="eyebrow">Shop by condition</p>
            <h2
              id="what-you-have-heading"
              className="mt-4 font-sans text-[clamp(2.25rem,4vw,3.75rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink"
            >
              <span className="block overflow-hidden pb-[0.15em] -mb-[0.15em]">
                <motion.span variants={lineClip} className="block">
                  What you have.
                </motion.span>
              </span>
            </h2>
          </motion.div>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-4 lg:col-start-9 lg:justify-self-end lg:text-right"
          >
            Every device is classified by its condition — so the word on the
            listing means the same thing every time. Pick a category and
            browse only what matches.
          </motion.p>
        </motion.div>

        {/* ---------- Legend grid ---------- */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.06, 0.1)}
          className={cn(
            "mt-14 grid gap-3 lg:mt-20 lg:gap-4",
            // Tablet: 2-across; the third card spans the row so no
            // lonely tile. Desktop: the three conditions run as one
            // equal row — the earlier 3+2 rhythm existed for five
            // entries and is gone with them.
            "sm:grid-cols-2",
            "lg:grid-cols-3",
          )}
        >
          {CONDITIONS.map((condition, i) => (
            <motion.li
              key={condition.id}
              variants={tileRise}
              className={cn(
                i === CONDITIONS.length - 1 && "sm:col-span-2 lg:col-span-1",
              )}
            >
              <ConditionTile condition={condition} index={i + 1} />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

/* ============================================================
   Tile — one condition entry, whole surface is a link
   ============================================================ */

function ConditionTile({
  condition,
  index,
}: {
  condition: ConditionItem;
  index: number;
}) {
  const defined = condition.status === "defined";

  return (
    <Link
      href={condition.href}
      className={cn(
        "group/tile relative flex h-full flex-col justify-between gap-10 overflow-hidden rounded-2xl p-6 sm:p-7 lg:min-h-[18rem] lg:p-8",
        "border bg-surface shadow-(--shadow-edge)",
        "transition-[background-color,border-color] duration-(--duration-fast) ease-(--ease-out-quart)",
        defined
          ? "border-line hover:border-line-strong hover:bg-surface-3"
          : "border-line/70 hover:border-line hover:bg-surface-3",
      )}
    >
      {/* ---------- Top row: numeric index + icon + status dot ---------- */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className={cn(
              "font-mono text-[0.6875rem] uppercase tabular-nums tracking-[0.2em] leading-none",
              defined ? "text-ink-muted" : "text-ink-faint",
            )}
          >
            {String(index).padStart(2, "0")}
          </span>
          <span
            aria-hidden
            className={cn(
              "flex size-12 items-center justify-center rounded-full border",
              "transition-[color,border-color,background-color] duration-(--duration-fast)",
              defined
                ? "border-line-strong text-ink group-hover/tile:border-accent group-hover/tile:bg-accent/10 group-hover/tile:text-accent"
                : "border-line text-ink-muted group-hover/tile:text-ink-secondary",
            )}
          >
            {condition.icon}
          </span>
        </div>

        <span
          aria-hidden
          className={cn(
            "mt-4 inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.18em]",
            defined ? "text-accent" : "text-ink-muted",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              defined ? "bg-accent" : "bg-ink-muted/70",
            )}
          />
          {defined ? "In catalogue" : "Not in PRD"}
        </span>
      </div>

      {/* ---------- Copy ---------- */}
      <div className="flex flex-col gap-3">
        <h3
          className={cn(
            "font-sans font-light leading-[1.05] tracking-[-0.025em] text-ink",
            "text-[clamp(1.75rem,2.4vw,2.25rem)]",
            !defined && "text-ink-secondary",
          )}
        >
          {condition.name}
        </h3>
        <p
          className={cn(
            "text-[0.9375rem] leading-snug",
            defined ? "text-ink-secondary" : "text-ink-muted",
          )}
        >
          {condition.label}
        </p>

        {/* Category CTA — visible affordance to browse this condition. */}
        <p
          className={cn(
            "mt-4 inline-flex items-center gap-2 text-[0.8125rem] font-medium",
            defined
              ? "text-ink group-hover/tile:text-accent"
              : "text-ink-muted",
            "transition-colors duration-(--duration-fast)",
          )}
        >
          {defined ? `Shop ${condition.name}` : "Details coming soon"}
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              "size-3 shrink-0",
              "transition-transform duration-(--duration-fast) ease-(--ease-out-quart)",
              "group-hover/tile:translate-x-1",
            )}
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </p>
      </div>
    </Link>
  );
}

/* ============================================================
   Icons — thin-line, monochromatic, currentColor
   ============================================================ */

function IconCycle() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M16.5 10a6.5 6.5 0 0 1-11.24 4.42" />
      <path d="M3.5 10A6.5 6.5 0 0 1 14.74 5.58" />
      <path d="M14.5 3v3H11.5M5.5 17v-3H8.5" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 6v4l2.5 2" />
    </svg>
  );
}

function IconPerson() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <circle cx="10" cy="7" r="3" />
      <path d="M3.5 17c1.2-3.2 3.6-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
    </svg>
  );
}
