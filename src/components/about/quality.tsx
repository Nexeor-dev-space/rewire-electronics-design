"use client";

import { motion } from "framer-motion";
import { getStandardStats } from "@/lib/standard";
import { StatFigure, statRise } from "@/components/home/standard/stat-figure";
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
 * Section 04 — Quality and testing.
 *
 * The three numbers the homepage already commits to (68-point
 * inspection, 98% minimum battery health, 12-month warranty), rendered
 * with the same `StatFigure` and `statRise` primitives so the two
 * surfaces cannot disagree about the promise.
 *
 * The footnote below the row is where the details of the programme
 * itself will live once it is published; we do not invent them here.
 */
export function AboutQuality() {
  const stats = getStandardStats();

  return (
    <section
      aria-labelledby="about-quality-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-void)_0%,#faf8f4_46%,var(--color-void)_100%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6"
        >
          <div className="lg:col-span-7">
            <motion.span variants={rise} className="eyebrow block">
              Quality & testing
            </motion.span>
            <motion.h2
              variants={rise}
              id="about-quality-heading"
              className="mt-6 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.035em] text-ink"
            >
              The floor is the same for every device.
            </motion.h2>
          </div>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
          >
            Three numbers set the standard we hold. A phone that falls
            short of any of them does not get released; it goes back to
            the bench or out of the programme.
          </motion.p>
        </motion.div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.12)}
          className="mt-20 grid border-t border-line pt-14 sm:grid-cols-3 lg:mt-24 lg:pt-16"
        >
          {stats.map((stat, i) => (
            <motion.li
              key={stat.id}
              variants={statRise}
              className={cn(
                "py-10 sm:py-0",
                i > 0 && "border-t border-line sm:border-t-0",
                i > 0 && "sm:border-l sm:border-line sm:pl-8 lg:pl-12",
                i < stats.length - 1 && "sm:pr-8 lg:pr-12",
              )}
            >
              <StatFigure stat={stat} />
            </motion.li>
          ))}
        </motion.ul>

        {/* Honest note about what is not yet published. Kept as running
            text so it does not read as a fourth statistic. */}
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mt-14 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-muted lg:mt-16"
        >
          The full inspection protocol — the checks that run on each
          board, the pass criteria per component family — will be
          published as the programme is documented. Until then, the
          numbers above are the promise.
        </motion.p>
      </div>
    </section>
  );
}
