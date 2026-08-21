"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { getFeaturedCategories } from "@/lib/categories";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { CategoryCard } from "./category-card";

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
 * Section 02 — Shop by Category.
 *
 * Sits directly under the hero so the second viewport opens on the
 * catalogue's index rather than the drop calendar — a reader who has
 * no interest in the four current releases is handed a way in
 * immediately. The cards are type-only for a reason: a photograph on
 * every cell turned this section into another product shelf. The index
 * numbers, the display type, and the mono meta line are the whole
 * design; the section reads as an index, not a store aisle.
 */
export function Categories() {
  const categories = getFeaturedCategories();

  return (
    <section
      aria-labelledby="categories-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.05),transparent_70%)]"
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
            <div className="lg:col-span-7">
              <motion.span variants={rise} className="eyebrow block">
                Shop by category
              </motion.span>
              <h2
                id="categories-heading"
                className="mt-5 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink"
              >
                <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                  <motion.span variants={lineClip} className="block">
                    Explore
                  </motion.span>
                </span>
                <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                  <motion.span variants={lineClip} className="block">
                    Our Collection.
                  </motion.span>
                </span>
              </h2>
            </div>

            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
            >
              Five families, one standard. Whatever you are browsing for
              arrives inspected, certified, and covered.
            </motion.p>
          </div>
        </motion.div>

        {/* ---------- The index ----------
            A compact 5-column grid on lg+, folding to 2 columns on md and
            a stack on mobile. No photography — the type is the design. */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.07, 0.12)}
          aria-label="Product categories"
          className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-5 lg:gap-5"
        >
          {categories.map((category, i) => (
            <motion.li
              key={category.id}
              variants={rise}
              className="flex"
            >
              <CategoryCard category={category} priority={i < 2} />
            </motion.li>
          ))}
        </motion.ul>

        {/* ---------- Footer ---------- */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={rise}
          className="mt-14 flex justify-center lg:mt-16"
        >
          <Link
            href={SHOP_INDEX_HREF}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Browse the full collection
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
