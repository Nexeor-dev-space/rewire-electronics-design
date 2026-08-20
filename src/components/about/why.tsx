"use client";

import { motion } from "framer-motion";
import { getAssurances, type AssuranceIcon } from "@/lib/assurances";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/**
 * Section 05 — Why Rewire.
 *
 * The six assurances from `getAssurances()`, drawn as a compact grid on
 * the surface plate. Icons are inline, single weight, no fills — the
 * house mark convention. There is no `assurance-icons.tsx` in the repo
 * yet; when there is, delete `Icon` below and consume it instead.
 */
export function AboutWhy() {
  const assurances = getAssurances();

  return (
    <section
      aria-labelledby="about-why-heading"
      className="relative bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6"
        >
          <div className="lg:col-span-7">
            <motion.span variants={rise} className="eyebrow block">
              Why Rewire
            </motion.span>
            <motion.h2
              variants={rise}
              id="about-why-heading"
              className="mt-6 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.035em] text-ink"
            >
              The reasons a shopper trusts a second-hand device.
            </motion.h2>
          </div>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
          >
            Every one of these is the same commitment across the store —
            not per drop, not per grade, not per category.
          </motion.p>
        </motion.div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.06, 0.06)}
          className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:mt-20 lg:grid-cols-3"
        >
          {assurances.map((assurance) => (
            <motion.li
              key={assurance.id}
              variants={rise}
              className="flex flex-col gap-5 bg-surface p-8 lg:p-10"
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-11 items-center justify-center rounded-full",
                  "border border-line bg-void text-ink",
                )}
              >
                <Icon name={assurance.icon} />
              </span>
              <div>
                <h3 className="text-lg font-medium leading-tight tracking-[-0.015em] text-ink">
                  {assurance.title}
                </h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
                  {assurance.description}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}

/* ============================================================
   Local: assurance icons
   ============================================================
   Small, single-weight marks that echo the header/cart glyphs. Kept
   local so a future shared `assurance-icons.tsx` can subsume them
   without touching this component. */

function Icon({ name }: { name: AssuranceIcon }) {
  const paths: Record<AssuranceIcon, React.ReactNode> = {
    certified: (
      <>
        <path d="m4.5 8 3 3L12 6.5" />
        <path d="M12 3.25a4 4 0 0 1 4 4 4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1-4-4 4 4 0 0 1 4-4 4 4 0 0 1 4-4Z" />
      </>
    ),
    battery: (
      <>
        <path d="M4 8.5h13a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 14v-4A1.5 1.5 0 0 1 4 8.5Z" />
        <path d="M20 11v2" />
        <path d="M5.75 10.75h6.5v2.5h-6.5z" fill="currentColor" stroke="none" />
      </>
    ),
    warranty: (
      <>
        <path d="M12 3.5 4.75 6v6c0 3.6 3.05 6.7 7.25 8 4.2-1.3 7.25-4.4 7.25-8V6L12 3.5Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    tested: (
      <>
        <path d="M7.5 3.75h9v10.5a4.5 4.5 0 0 1-9 0Z" />
        <path d="M6 3.75h12" />
        <path d="M11 14.75h2v5.5h-2z" />
      </>
    ),
    payments: (
      <>
        <path d="M4 6.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
        <path d="M3 10.5h18" />
        <path d="M7 14.5h4" />
      </>
    ),
    delivery: (
      <>
        <path d="M3.25 6.5h11v9h-11z" />
        <path d="M14.25 9.5h4l2.5 3v3h-6.5" />
        <circle cx="7.5" cy="17" r="1.75" />
        <circle cx="16.5" cy="17" r="1.75" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5"
    >
      {paths[name]}
    </svg>
  );
}
