"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { cn } from "@/lib/utils";
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
 * Section 07 — Closing invitation.
 *
 * The page has argued the standard, defined the vocabulary and named
 * the four conditions. The one thing left is to let the reader act.
 * One button, one destination — nothing else, so the exit is
 * unambiguous.
 */
export function AboutCta() {
  return (
    <section
      aria-labelledby="about-cta-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-(--spacing-section)"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(120%_90%_at_50%_0%,rgb(255_255_255/0.05),transparent_70%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.12)}
          className="mx-auto flex max-w-3xl flex-col items-center text-center"
        >
          <motion.span variants={rise} className="eyebrow block">
            Ready when you are
          </motion.span>

          <h2
            id="about-cta-heading"
            className="mt-8 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.03em] text-ink"
          >
            <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
              <motion.span variants={lineClip} className="block">
                See what is on the shelf.
              </motion.span>
            </span>
          </h2>

          <motion.p
            variants={rise}
            className="mt-6 max-w-lg text-base leading-relaxed text-ink-secondary"
          >
            Every device in the catalogue has passed the same standard
            described on this page.
          </motion.p>

          <motion.div variants={rise} className="mt-10">
            <Link
              href={SHOP_INDEX_HREF}
              className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
            >
              Explore Products
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
