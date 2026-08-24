"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { getFeaturedCategories } from "@/lib/categories";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { DURATION, EASE_OUT_EXPO, staggerChildren, viewportOnce } from "@/lib/motion";
import { CategoryCard } from "./category-card";

const rise = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/**
 * Section 02 — the catalogue index.
 *
 * **Preserved but no longer rendered on the homepage.** The five cards
 * now live inside the banner as `hero/category-strip.tsx`, directly
 * under the product, so the catalogue is offered without spending a
 * second viewport on it. Reinstate this section only if the index needs
 * room the banner cannot give it — a sixth family, or photography that
 * has to run at square scale.
 *
 * The header this section carried — "Shop by category / Explore Our
 * Collection." over a supporting line — is gone rather than moved. Above
 * five labelled photographs it was captioning the obvious, and inside
 * the banner it would have competed with the product's own headline.
 * If this section returns, it returns headerless: the cards are the
 * index, and the trailing link is the only chrome they need.
 */
export function Categories() {
  const categories = getFeaturedCategories();

  return (
    <section
      aria-label="Shop by category"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.05),transparent_70%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        {/* ---------- The index ----------
            A compact 5-column grid on lg+, folding to 2 columns on md and
            a stack on mobile. No photography — the type is the design. */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.07, 0.12)}
          aria-label="Product categories"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5"
        >
          {categories.map((category, i) => (
            <motion.li key={category.id} variants={rise} className="flex">
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
