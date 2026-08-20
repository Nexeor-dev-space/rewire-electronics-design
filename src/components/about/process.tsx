"use client";

import { motion } from "framer-motion";
import { getCertificationSteps } from "@/lib/certification";
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
 * Section 02 — How Rewire works.
 *
 * The five certification steps, as a numbered horizontal rail with
 * hairlines between. Reads as a sequence rather than a feature list,
 * which is the whole distinction between a programme and a page of
 * reassuring adjectives — the file the steps come from makes that
 * argument explicitly and this UI honours it: the numbers are the
 * design.
 */
export function AboutProcess() {
  const steps = getCertificationSteps();

  return (
    <section
      aria-labelledby="about-process-heading"
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
              How Rewire works
            </motion.span>
            <motion.h2
              variants={rise}
              id="about-process-heading"
              className="mt-6 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.035em] text-ink"
            >
              A programme, not a promise.
            </motion.h2>
          </div>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
          >
            Every device that reaches our name passes the same five stages,
            in the same order. Skipping one is what would make a
            certification a marketing word.
          </motion.p>
        </motion.div>

        {/* ---------- The rail ----------
            A single row on xl, folding to 2 columns on md and to a stack
            on the smallest screens. Hairlines separate the numbers on
            wide screens so the sequence is legible at a glance; on
            narrow screens the rules become horizontal to keep the same
            "steps in order" reading. */}
        <motion.ol
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.08, 0.1)}
          className={cn(
            "mt-20 grid gap-y-10 lg:mt-24",
            "md:grid-cols-2 md:gap-x-8",
            "xl:grid-cols-5 xl:gap-x-0",
          )}
        >
          {steps.map((step, index) => (
            <motion.li
              key={step.id}
              variants={rise}
              className={cn(
                "relative",
                // Hairline between steps on xl only (never trailing the
                // last card). Vertical dividers keep the row reading as
                // sequence rather than tiles.
                index > 0 && "xl:border-l xl:border-line xl:pl-8",
                index < steps.length - 1 && "xl:pr-8",
                // On narrow screens each step earns a horizontal rule
                // above it, except the first.
                index > 0 && "border-t border-line pt-10 md:border-t-0 md:pt-0",
              )}
            >
              <p className="font-mono text-[0.8125rem] tabular-nums tracking-[0.2em] text-ink-faint">
                {String(index + 1).padStart(2, "0")}
              </p>
              <p className="mt-4 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-accent">
                {step.stage}
              </p>
              <h3 className="mt-4 text-xl font-medium leading-tight tracking-[-0.015em] text-ink">
                {step.title}
              </h3>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-secondary">
                {step.description}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
