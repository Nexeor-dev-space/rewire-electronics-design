"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getUpcomingDrops } from "@/lib/drops";
import { buttonVariants } from "@/components/ui/button";
import { DropCard } from "./drop-card";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 32 },
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
 * Section 02 — Upcoming Drops.
 * Editorial release calendar: an oversized statement, then three drop
 * plates that reveal on scroll with staggered timing, closed by a
 * centered magnetic CTA.
 */
export function UpcomingDrops() {
  const drops = getUpcomingDrops();

  return (
    <section
      aria-labelledby="upcoming-drops-heading"
      className="relative overflow-hidden pt-(--spacing-section)"
    >
      {/* Background depth — soft lighting, no clutter */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-void)_0%,#faf8f4_45%,var(--color-void)_100%)]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[18%] size-[46rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(44_90_160/0.07),transparent_72%)] blur-2xl"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- Section header ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
        >
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
            <h2
              id="upcoming-drops-heading"
              className="font-sans text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink lg:col-span-7"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Upcoming
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  drops.
                </motion.span>
              </span>
            </h2>

            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
            >
              Discover our next exclusive releases. Every device is
              professionally tested, certified, and available only during
              limited-time product drops.
            </motion.p>
          </div>
        </motion.div>

        {/* ---------- Drop plates ---------- */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.14, 0.1)}
          className="mt-16 grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:mt-20 xl:grid-cols-4"
        >
          {drops.map((drop, i) => (
            <motion.li key={drop.id} variants={rise} className="flex h-full">
              <DropCard drop={drop} priority={i === 0} />
            </motion.li>
          ))}
        </motion.ul>

        {/* ---------- Section footer ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mt-20 flex justify-center lg:mt-24"
        >
          <Link
            href="/drops"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            View all upcoming drops
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
      </div>
    </section>
  );
}
