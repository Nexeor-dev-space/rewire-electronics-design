"use client";

import { motion } from "framer-motion";
import { siteConfig } from "@/lib/site";
import { getCategories } from "@/lib/categories";
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
 * Section 02 — What Rewire does.
 *
 * Editorial split: the argument on the left, the sold-here families on
 * the right, drawn from `getCategories` so the list on this page and
 * the shop's own navigation cannot drift apart. Two paragraphs — no
 * more — because this section's job is to set the ground for the
 * process section that follows.
 */
export function AboutWhat() {
  const categories = getCategories();

  return (
    <section
      aria-labelledby="about-what-heading"
      className="relative bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* ---------- Argument ---------- */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren(0.1)}
            className="lg:col-span-6"
          >
            <motion.span variants={rise} className="eyebrow block">
              What we do
            </motion.span>
            <motion.h2
              variants={rise}
              id="about-what-heading"
              className="mt-6 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.035em] text-ink"
            >
              A certified-renewed electronics label.
            </motion.h2>

            <motion.p
              variants={rise}
              className="mt-8 max-w-xl text-base leading-relaxed text-ink-secondary"
            >
              {siteConfig.description}
            </motion.p>

            <motion.p
              variants={rise}
              className="mt-5 max-w-xl text-base leading-relaxed text-ink-secondary"
            >
              We do not carry inventory in the ordinary retail sense. Each
              device is bought back, taken apart, measured against its
              original specification, and released to the person who
              ordered it — never resold on appearance alone.
            </motion.p>
          </motion.div>

          {/* ---------- The families we trade in ----------
              Numbered rows for the same reason the process section is
              numbered: an ordered list reads as a set, not as tiles. */}
          <motion.dl
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren(0.08, 0.1)}
            className="border-t border-line lg:col-span-6 lg:col-start-7"
          >
            {categories.map((category, index) => (
              <motion.div
                key={category.id}
                variants={rise}
                className="flex items-baseline gap-6 border-b border-line py-6 lg:gap-8 lg:py-7"
              >
                <dt className="w-10 shrink-0 font-mono text-[0.8125rem] tabular-nums tracking-[0.2em] text-ink-faint">
                  {String(index + 1).padStart(2, "0")}
                </dt>
                <dd className="flex flex-1 items-baseline justify-between gap-6">
                  <span className="text-lg font-medium tracking-[-0.015em] text-ink">
                    {category.name}
                  </span>
                  <span className="text-[0.875rem] text-ink-secondary">
                    {category.note}
                  </span>
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </div>
    </section>
  );
}
