"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { DURATION, EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

interface Condition {
  id: string;
  /** Two-character grade mark set as the card's visual anchor. */
  mark: string;
  name: string;
  body: string;
  cta: string;
  href: string;
}

/**
 * Four product conditions, not four categories. Ordered by how much
 * the device has been touched since it left the factory: the most
 * worked-on plate first, unopened stock last.
 */
const CONDITIONS: Condition[] = [
  {
    id: "refurbished",
    mark: "R",
    name: "Refurbished",
    body: "Fully restored, tested, and certified to the Rewire standard.",
    cta: "Shop Refurbished",
    href: "/shop/refurbished",
  },
  {
    id: "pre-owned",
    mark: "P",
    name: "Pre-Owned",
    body: "Previously used devices, inspected and graded before resale.",
    cta: "Shop Pre-Owned",
    href: "/shop/pre-owned",
  },
  {
    id: "just-opened",
    mark: "J",
    name: "Just Opened",
    body: "Unused stock with a broken seal — as new, at a lower price.",
    cta: "Shop Just Opened",
    href: "/shop/just-opened",
  },
  {
    id: "new",
    mark: "N",
    name: "New",
    body: "Sealed, unopened devices in their original packaging.",
    cta: "Shop New",
    href: "/shop/new",
  },
];

/**
 * Shop by Condition — an entry point parallel to Categories.
 *
 * Categories asks "what device"; this asks "in what state". The four
 * cards read as a scale of intervention (most-worked-on first), so the
 * order itself carries meaning and the labels do not need to justify it.
 *
 * Deliberately image-free: the site's category rail already carries the
 * photography load right above, and adding four more photographs would
 * blur the distinction the section exists to draw. The mark, the name,
 * the line, the link — nothing else.
 */
export function Conditions() {
  return (
    <section
      aria-labelledby="conditions-heading"
      className="relative bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- Header ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
        >
          <div className="grid gap-x-6 gap-y-4 pb-10 lg:grid-cols-12 lg:items-end lg:pb-12">
            <div className="lg:col-span-7">
              <span className="eyebrow block">By condition</span>
              <h2
                id="conditions-heading"
                className="mt-6 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.035em] text-ink"
              >
                Shop by Condition
              </h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-4 lg:col-start-9 lg:justify-self-end">
              Choose the condition that works for you.
            </p>
          </div>
        </motion.div>

        {/* ---------- The four cards ----------
            Swipe rail below sm, 2×2 on tablet, 1×4 from xl. Same rhythm
            as the Process grid so this section reads as part of the
            same page, not a separate module. */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={stagger}
          className={cn(
            "no-scrollbar -mx-(--spacing-gutter) flex snap-x snap-mandatory gap-6 overflow-x-auto px-(--spacing-gutter) pb-4",
            "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0",
            "xl:grid-cols-4 xl:gap-8",
          )}
        >
          {CONDITIONS.map((condition, i) => (
            <motion.li
              key={condition.id}
              variants={rise}
              className="w-[78vw] shrink-0 snap-start sm:w-auto"
            >
              <Link
                href={condition.href}
                aria-label={condition.cta}
                className={cn(
                  "group flex h-full flex-col rounded-xl bg-surface p-8 lg:p-9",
                  "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                  "hover:-translate-y-1.5 focus-visible:-translate-y-1.5",
                  "motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0",
                )}
              >
                {/* Header row: numeral + grade mark, in the same
                    monospace register as the process card numbers. */}
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[0.8125rem] tabular-nums tracking-[0.2em] text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "font-sans text-[3.25rem] font-light leading-none tracking-[-0.04em] text-ink-faint lg:text-[3.75rem]",
                      "transition-colors duration-(--duration-base) ease-(--ease-out-expo)",
                      "group-hover:text-ink group-focus-visible:text-ink",
                    )}
                  >
                    {condition.mark}
                  </span>
                </div>

                {/* Hairline separator — quiet, same weight as Standard's spec sheet. */}
                <div aria-hidden className="mt-10 border-t border-line" />

                <h3
                  className={cn(
                    "mt-8 text-2xl font-medium leading-tight tracking-[-0.02em] text-ink",
                    "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                    "group-hover:-translate-y-1 group-focus-visible:-translate-y-1",
                    "motion-reduce:group-hover:translate-y-0",
                  )}
                >
                  {condition.name}
                </h3>

                <p className="mt-3 text-base leading-relaxed text-ink-secondary">
                  {condition.body}
                </p>

                {/* CTA sits at the foot so all four cards match height
                    regardless of body length. */}
                <div className="mt-auto flex items-center gap-2 pt-10 text-sm font-medium text-ink">
                  <span>{condition.cta}</span>
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
                      "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                      "group-hover:translate-x-1 group-focus-visible:translate-x-1",
                    )}
                  >
                    <path d="M3 8h10M9 4l4 4-4 4" />
                  </svg>
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
