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
  visible: {
    y: "0%",
    transition: { duration: 1, ease: EASE_OUT_EXPO },
  },
};

/**
 * WishlistEmpty — the empty state.
 *
 * Same editorial register as the cart's empty state: hairline mark, one
 * clipped-reveal line the reader can take as an invitation, one clear
 * route back into the catalogue. No secondary link — the wishlist has
 * one job, and offering a detour dilutes it.
 */
export function WishlistEmpty() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={staggerChildren(0.09, 0.05)}
      className="mt-16 flex flex-col items-center text-center md:mt-24"
    >
      {/* ---------- Mark ---------- */}
      <motion.div
        variants={rise}
        aria-hidden
        className="relative flex size-24 items-center justify-center rounded-full border border-line bg-surface"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-10 text-ink-secondary"
        >
          <path d="M12 20.25S3.75 15.5 3.75 9.6A4.35 4.35 0 0 1 12 7.6a4.35 4.35 0 0 1 8.25 2c0 5.9-8.25 10.65-8.25 10.65Z" />
        </svg>
      </motion.div>

      {/* ---------- Editorial line ---------- */}
      <div className="mt-10">
        <h2 className="font-sans text-[clamp(1.75rem,3.2vw,2.75rem)] font-light leading-[1.1] tracking-[-0.025em] text-ink">
          <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
            <motion.span variants={lineClip} className="block">
              Save products you want
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
            <motion.span variants={lineClip} className="block">
              to come back to.
            </motion.span>
          </span>
        </h2>
      </div>

      <motion.p
        variants={rise}
        className="mt-6 max-w-md text-base leading-relaxed text-ink-secondary"
      >
        Tap the heart on any device and it will wait here — a personal
        shortlist, held between visits.
      </motion.p>

      {/* ---------- Action ---------- */}
      <motion.div variants={rise} className="mt-10">
        <Link
          href={SHOP_INDEX_HREF}
          className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
        >
          Continue Shopping
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
  );
}
