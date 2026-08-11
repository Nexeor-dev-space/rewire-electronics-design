"use client";

import { motion } from "framer-motion";
import { getCertificationSteps } from "@/lib/certification";
import { pad } from "@/lib/utils";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 24 },
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
 * Why Rewire — the certification programme, set as a document.
 *
 * The brief for this section was "not a generic corporate icon grid", and
 * the way out of one is to stop drawing icons and start setting type. So
 * the numerals *are* the graphics: each step is a hairline-ruled row with
 * an oversized index on the left and the plain fact on the right, which
 * is how a specification is printed rather than how a feature is sold.
 *
 * The stage rail above it — INSPECTED → GRADED → WARRANTED → VERIFIED →
 * READY — exists because five rows is a list, and a shopper skimming for
 * confidence wants the shape before the detail. It carries the same five
 * items in one line, so nothing in it is new information.
 *
 * Numbers stay ink. This section's job is credibility, and the accent is
 * spoken for elsewhere: orange here would say "offer" where the page
 * needs it to say "standard".
 */
export function Certification() {
  const steps = getCertificationSteps();

  return (
    <section
      aria-labelledby="certification-heading"
      // Top rhythm only: the next section's own top padding closes this
      // one. Carrying `py` double-padded the junction into a dead band.
      className="relative overflow-hidden bg-void pt-(--spacing-section)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
        >
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2
              id="certification-heading"
              className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.03] tracking-[-0.035em] text-ink lg:col-span-6"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Why Rewire?
                </motion.span>
              </span>
            </h2>

            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:col-start-8 lg:justify-self-end"
            >
              Every device earns its second life. Five things happen to it
              before it is allowed into a drop — and it only ships once all
              five are done.
            </motion.p>
          </div>

          {/* ---------- The shape, before the detail ----------
              One line from `md`; below that it would wrap into a ragged
              block that reads as neither a sequence nor a list. */}
          <motion.ol
            variants={rise}
            aria-label="Certification sequence"
            className="mt-12 hidden items-center justify-between gap-4 border-y border-line py-5 md:flex lg:mt-16"
          >
            {steps.map((step, i) => (
              <li
                key={step.id}
                className="flex items-center gap-4 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink"
              >
                {step.stage}
                {i < steps.length - 1 && (
                  <span aria-hidden className="text-ink-faint">
                    →
                  </span>
                )}
              </li>
            ))}
          </motion.ol>
        </motion.div>

        {/* ---------- The document ---------- */}
        <motion.ol
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.07, 0.1)}
          className="mt-12 border-t border-line md:mt-10 lg:mt-14"
        >
          {steps.map((step, i) => (
            <motion.li
              key={step.id}
              variants={rise}
              className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 border-b border-line py-6 sm:gap-x-10 lg:grid-cols-[auto_20rem_1fr] lg:gap-x-14 lg:py-7"
            >
              {/* The numeral is the graphic. Tabular so five rows of
                  indices sit on one optical edge. */}
              <span
                aria-hidden
                className="font-sans text-[1.5rem] font-light leading-none tabular-nums tracking-[-0.03em] text-ink-faint sm:text-[1.875rem] lg:text-[2.25rem]"
              >
                {pad(i + 1)}
              </span>

              <h3 className="text-[1.0625rem] font-medium leading-tight tracking-[-0.01em] text-ink sm:text-[1.25rem]">
                {step.title}
              </h3>

              <p className="col-start-2 mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-secondary lg:col-start-3 lg:mt-0">
                {step.description}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
