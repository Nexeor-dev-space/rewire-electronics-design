"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { getFeaturedCategories } from "@/lib/categories";
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
 * Section 04 — Shop by Category.
 *
 * A way into the catalogue, built as a horizontal gallery rather than a
 * grid: five photographs on a rail that reads as product navigation, not
 * a shop shelf. All five sit in view from `xl`; below that the rail
 * scrolls and snaps, bleeding to the screen edge so a partial card
 * always signals there is more.
 */
export function Categories() {
  const categories = getFeaturedCategories();

  return (
    <section
      aria-labelledby="categories-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section)"
    >
      {/* One soft wash, kept low so the photography carries the section */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.7),transparent_70%)]"
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
              id="categories-heading"
              className="font-sans text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink lg:col-span-7"
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

            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
            >
              Five categories, one standard. Whatever you are browsing for
              arrives inspected, certified, and covered.
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* ---------- The rail ----------
          Sits outside the padded container and re-applies the gutter as
          scroll padding, so cards bleed to the viewport edge while their
          resting position still lines up with the heading above. */}
      <motion.ul
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={staggerChildren(0.09, 0.12)}
        aria-label="Product categories"
        className="no-scrollbar relative z-10 mt-16 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-(--spacing-gutter) px-(--spacing-gutter) pb-2 sm:gap-6 lg:mt-20 xl:gap-8"
      >
        {categories.map((category, i) => (
          <motion.li
            key={category.id}
            variants={rise}
            className="w-[68%] shrink-0 snap-start sm:w-[42%] lg:w-[30%] xl:w-[calc((100%-8rem)/5)]"
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
        className="relative z-10 mx-auto mt-16 flex w-full max-w-[110rem] justify-center px-(--spacing-gutter) lg:mt-20"
      >
        <Link
          href="/collection"
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
    </section>
  );
}
