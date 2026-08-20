"use client";

import { motion } from "framer-motion";
import { ConditionExplainer } from "@/components/product/detail/condition-explainer";
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

/**
 * Section 03 — The four conditions.
 *
 * Reuses the product page's `ConditionExplainer` so the four states are
 * defined in exactly one place. On this page the component runs without
 * an `active` prop — no card is highlighted and the "On this listing"
 * header is suppressed, because the About page is describing the shop
 * at large rather than a single listing.
 */
export function AboutConditions() {
  return (
    <section
      aria-labelledby="about-conditions-heading"
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
              What we sell
            </motion.span>
            <motion.h2
              variants={rise}
              id="about-conditions-heading"
              className="mt-6 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.035em] text-ink"
            >
              Four conditions, one vocabulary.
            </motion.h2>
          </div>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
          >
            The state a device arrives in is the first thing a shopper
            reads, so it is defined once, on the same terms across the
            catalogue.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mt-14 lg:mt-20"
        >
          <ConditionExplainer />
        </motion.div>
      </div>
    </section>
  );
}
