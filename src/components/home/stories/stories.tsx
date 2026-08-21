"use client";

import { motion } from "framer-motion";
import { getReviewSummary, getTestimonials } from "@/lib/testimonials";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { TestimonialCarousel } from "./testimonial-carousel";

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
 * The Rewire Experience — social proof, set as pull-quotes.
 *
 * Quotes on hairlines rather than cards: a testimonial in a bordered box
 * with a rounded avatar is the shape every SaaS page uses, and it reads as
 * marketing the moment it appears. Set as editorial quotes with the device
 * underneath, the same words read as reporting. The carousel keeps that
 * shape at any length — see `testimonial-carousel.tsx`.
 *
 * The summary line is **derived** from the collection, never written down.
 * See the warning at the top of `lib/testimonials.ts`: a hardcoded rating
 * is a factual claim that survives the swap to real content unnoticed. The
 * rating is dropped entirely when nothing in the data carries one, so this
 * is safe to ship before real reviews exist.
 */
export function Stories() {
  const testimonials = getTestimonials();
  const { average, verifiedCount } = getReviewSummary();

  return (
    <section
      aria-labelledby="stories-heading"
      // Top rhythm only — see the note in `standard.tsx`.
      // A shade lifted from `void`, so the testimonials read as their own
      // band between the sections either side of them.
      className="relative overflow-hidden bg-surface-2 pt-(--spacing-section-sm)"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className="grid gap-6 lg:grid-cols-12 lg:items-end"
        >
          <div className="lg:col-span-6">
            <h2
              id="stories-heading"
              className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.03] tracking-[-0.035em] text-ink"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  The Rewire experience.
                </motion.span>
              </span>
            </h2>

            <motion.p
              variants={rise}
              className="mt-5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted"
            >
              {average !== null && (
                <>
                  <span className="text-ink">{average.toFixed(1)}/5</span>
                  <span className="text-ink-faint"> · </span>
                </>
              )}
              {verifiedCount} verified purchases
            </motion.p>
          </div>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:col-start-8 lg:justify-self-end"
          >
            What people say after the box arrives — the part of a refurbished
            purchase nobody can promise you in advance.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mt-12 lg:mt-16"
        >
          <TestimonialCarousel items={testimonials} />
        </motion.div>
      </div>
    </section>
  );
}
