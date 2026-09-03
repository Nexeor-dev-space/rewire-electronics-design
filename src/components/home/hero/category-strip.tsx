"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getFeaturedCategories } from "@/lib/categories";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { CategoryCard } from "@/components/home/categories/category-card";

/**
 * CategoryStrip — the four families, closing the banner.
 *
 * This is the catalogue index that used to open the second viewport as
 * its own titled section. Moving it inside the hero removes the header
 * that announced it ("Shop by category / Explore Our Collection.") on
 * purpose: under the product, in the banner's own frame, four labelled
 * photographs are self-evidently the way in, and a section title over
 * them would be reading the picture aloud.
 *
 * The families are Smartphones, Laptops, Tablets and Accessories —
 * read from `getFeaturedCategories()`, which is the same list the
 * navbar rail is built from, so the banner and the chrome above it can
 * never offer a shopper different ways in. It was five until Audio and
 * Wearables stopped being primary navigation.
 *
 * Layout is a swipeable rail below `lg` and a four-across grid above
 * it. The rail keeps the strip one row tall at every width, which is
 * the only shape that can live inside a viewport-height banner —
 * stacking the cards would put ~500px of navigation between the product
 * and the fold.
 *
 * No image here is `priority`. The banner already spends its preload
 * budget on the product cutout, and four category plates competing for
 * it is the classic way to lose the LCP a hero exists to win.
 */
export function CategoryStrip() {
  const categories = getFeaturedCategories();

  return (
    <motion.nav
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: DURATION.slow, ease: EASE_OUT_EXPO }}
      aria-label="Product categories"
      className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter) pb-6 lg:pb-10"
    >
      <ul
        className={cn(
          // The rail. Negative margins + matching padding let the cards
          // bleed to the viewport edge as they scroll while the first
          // one still starts on the gutter — a rail that stops short of
          // the edge reads as a clipped grid, not as something to swipe.
          "-mx-(--spacing-gutter) flex snap-x snap-mandatory gap-3 overflow-x-auto px-(--spacing-gutter) pb-1",
          // Without a matching scroll-padding the browser snaps the first
          // card flush to the viewport edge on load — it lands on the
          // snap point and eats the gutter the padding just paid for.
          "scroll-px-(--spacing-gutter)",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0",
        )}
      >
        {categories.map((category) => (
          <li
            key={category.id}
            className="w-[62%] shrink-0 snap-start min-[480px]:w-[44%] md:w-[30%] lg:w-auto lg:shrink"
          >
            <CategoryCard category={category} compact />
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}
