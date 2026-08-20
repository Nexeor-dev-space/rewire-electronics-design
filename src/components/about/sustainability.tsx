"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  DURATION,
  EASE_OUT_EXPO,
  scaleIn,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/**
 * Section 06 — Circular technology.
 *
 * The one part of the brand story that is a *consequence* rather than a
 * claim: every device sold as certified-renewed is a device not built
 * from scratch. The copy stays on that ground — no tonnage, no CO₂
 * figures, no year-on-year comparisons — because the impact-reporting
 * programme has not been published yet and printing a number here that
 * has not been measured would falsify the rest of the page.
 */
export function AboutSustainability() {
  return (
    <section
      aria-labelledby="about-sustainability-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16"
        >
          <div className="lg:col-span-6">
            <motion.span variants={rise} className="eyebrow block">
              Circular technology
            </motion.span>
            <motion.h2
              variants={rise}
              id="about-sustainability-heading"
              className="mt-6 font-sans text-[clamp(2rem,3.6vw,3rem)] font-light leading-[1.06] tracking-[-0.03em] text-ink"
            >
              A device we release is a device that was not built again.
            </motion.h2>

            <motion.p
              variants={rise}
              className="mt-8 max-w-xl text-base leading-relaxed text-ink-secondary"
            >
              The most consequential thing about a refurbished device is
              the one that never happens — the mining, the assembly, the
              shipping of a new one to take its place. Our part in that is
              modest but real: keeping devices in circulation for longer
              than the market alone would.
            </motion.p>

            <motion.p
              variants={rise}
              className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-muted"
            >
              Impact figures — units diverted, materials recovered, cells
              recycled — will be published once the programme has enough
              cycles behind it to report honestly. We would rather stay
              silent for another quarter than round up.
            </motion.p>
          </div>

          <motion.div
            variants={scaleIn}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-surface-2 lg:col-span-6"
          >
            <Image
              src="/images/craft/craft-01.jpg"
              alt="Macro detail of a restored device's finish under studio light"
              fill
              sizes="(max-width: 1024px) 92vw, 44rem"
              className="object-cover"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
