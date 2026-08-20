"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getFeaturedProducts } from "@/lib/products";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { StorefrontCard } from "@/components/product/storefront-card";
import { buttonVariants } from "@/components/ui/button";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

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
 * Best sellers — the ordinary shelf.
 *
 * The most important section on the page for one narrow reason: without
 * it Rewire reads as a brand that opens occasionally, not a shop that is
 * open now. Everything above it is tied to a drop — an edition, a
 * countdown, an allocation — and a visitor who arrives between drops
 * finds nothing they can simply buy.
 *
 * One product per category rather than the four best of anything, so the
 * row doubles as a map of the range. Deliberately plainer than the drop
 * plates above: no editions, no clocks, no scarcity. Stock, price, saving,
 * done.
 */
export function Featured() {
  const products = getFeaturedProducts();

  return (
    <section
      aria-labelledby="featured-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
        >
          <motion.p
            variants={rise}
            className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-muted"
          >
            In stock now
          </motion.p>

          {/* Top-aligned, not bottom-aligned: the heading is a single line
              and the description runs three, so `items-end` bottom-anchored
              the paragraph to the heading's baseline and left the top half
              of the right column empty — the two blocks read as unrelated.
              `items-start` pins both to the same top edge, so the
              description sits as a sibling explainer beside the heading. */}
          <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
            <h2
              id="featured-heading"
              className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.03] tracking-[-0.035em] text-ink lg:col-span-6"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Best sellers.
                </motion.span>
              </span>
            </h2>

            {/* `lg:pt-3` optically nudges the paragraph down so its first
                line sits on the heading's cap-height rather than floating
                a hair above it — the heading's clamp-scaled size leaves a
                small visual offset that a raw top-align makes obvious. */}
            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:col-start-8 lg:justify-self-end lg:pt-3"
            >
              No countdown, no allocation. The devices that move fastest,
              available to buy today and covered by the same standard as
              everything we release.
            </motion.p>
          </div>
        </motion.div>

        {/* Four up on desktop, two on tablet, and a peek rail on phones —
            a four-card column makes a shopper scroll the whole section to
            learn how much of it there is. */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.09, 0.1)}
          className={cn(
            "mt-14 lg:mt-16",
            "no-scrollbar -mx-(--spacing-gutter) flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-(--spacing-gutter) px-(--spacing-gutter) pb-4",
            "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 sm:overflow-visible sm:px-0 sm:pb-0",
            "xl:grid-cols-4",
          )}
        >
          {products.map((product, i) => (
            <motion.li
              key={product.id}
              variants={rise}
              className="flex w-[78%] shrink-0 snap-start sm:w-auto"
            >
              <StorefrontCard product={product} priority={i < 2} />
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mt-16 flex justify-center lg:mt-20"
        >
          <Link
            href={SHOP_INDEX_HREF}
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            Shop all devices
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
