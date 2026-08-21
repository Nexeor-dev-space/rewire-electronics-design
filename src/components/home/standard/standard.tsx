"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { getStandardHotspots, getStandardStats } from "@/lib/standard";
import {
  DURATION,
  EASE_OUT_EXPO,
  scaleIn,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { cn } from "@/lib/utils";
import { StatFigure, statRise } from "./stat-figure";

const rise = {
  hidden: { opacity: 0, y: 28 },
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
 * Section 03 — The Rewire Standard.
 *
 * An editorial split: the argument on the left, one feature card on the
 * right, and the three numbers that back it underneath. The card is an
 * Apple-style product highlight — headline, one supporting line, the
 * device render with its real studio shadow, and the four certifications
 * as a quiet spec sheet. No leaders, no callouts, no chrome on the image.
 */
export function Standard() {
  // The certification labels double as the card's spec sheet.
  const certifications = getStandardHotspots().map((h) => h.label);
  const stats = getStandardStats();

  return (
    <section
      aria-labelledby="standard-heading"
      // Top padding only, like every other content section: the next
      // section's own top rhythm closes this one. Carrying `py` here
      // double-padded the junction to twice the page's spacing.
      /* Bottom padding mirrors the stat row's own `pt-14 lg:pt-16`, so the
         vertical dividers get the same air below them as they have above. */
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      {/* One wash, one light. Nothing else behind the content. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,var(--color-void)_0%,var(--color-surface-3)_46%,var(--color-void)_100%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- Split: the argument, the object ---------- */}
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren(0.1)}
            className="lg:col-span-5"
          >
            <motion.span variants={rise} className="eyebrow block">
              The Rewire Standard
            </motion.span>

            <h2
              id="standard-heading"
              className="mt-9 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.04] tracking-[-0.035em] text-ink"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Every device earns
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  its second life.
                </motion.span>
              </span>
            </h2>

            <motion.p
              variants={rise}
              className="mt-8 max-w-md text-base leading-relaxed text-ink-secondary"
            >
              A device only carries our name once it has been taken apart,
              measured against the original specification, and rebuilt to a
              standard we would accept for ourselves. Nothing here is resold on
              appearance alone.
            </motion.p>

            <motion.div variants={rise} className="mt-11">
              <Link
                href="/process"
                className={buttonVariants({ variant: "primary", size: "lg" })}
              >
                Learn More
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

          {/* ---------- The feature card ---------- */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={rise}
            // Column 6 stays empty on purpose — the breathing room between
            // the argument and the card is part of the composition.
            className="lg:col-span-6 lg:col-start-7"
          >
            <div className="rounded-[2rem] bg-surface p-8 sm:p-10">
              <h3 className="font-sans text-[clamp(1.625rem,2.4vw,2.25rem)] font-light leading-[1.12] tracking-[-0.025em] text-ink">
                Certified to Perform.
              </h3>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-secondary">
                Rebuilt, measured and sealed before it ever carries the Rewire
                name.
              </p>

              {/* Framed 2:1 rather than the source's 3:2. The photograph
                  carries a lot of empty studio floor above and below the
                  device, so cropping to a letterbox loses no product and
                  takes ~100px off a card that otherwise towers over the
                  column beside it. */}
              <motion.div
                variants={scaleIn}
                className="relative mt-8 aspect-2/1 w-full overflow-hidden rounded-lg"
              >
                <Image
                  src="/images/rewire-img.jpg"
                  alt="Refurbished phone with an iridescent back, photographed on a seamless studio background"
                  fill
                  sizes="(max-width: 1024px) 84vw, 32rem"
                  className="object-cover"
                />
              </motion.div>

              {/* Certifications as a quiet spec sheet — hairlines, no chips */}
              <ul className="mt-8 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                {certifications.map((label) => (
                  <li
                    key={label}
                    className="border-t border-line py-3 text-sm text-ink-secondary"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        {/* ---------- The three numbers ---------- */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.12)}
          // Drawn closer to the argument it backs, so the numbers read as
          // evidence rather than a detached footer.
          className="mt-20 grid border-t border-line pt-14 sm:grid-cols-3 lg:mt-28 lg:pt-16"
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
      </div>
    </section>
  );
}
