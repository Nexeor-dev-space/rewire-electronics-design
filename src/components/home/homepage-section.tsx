import type { ReactNode } from "react";
import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Featured } from "@/components/home/featured/featured";
import { WhatYouHave } from "@/components/home/conditions/what-you-have";
import { Stories } from "@/components/home/stories/stories";
import { Faq } from "@/components/home/faq/faq";
import { Invitation } from "@/components/home/invitation/invitation";
import { PromoBanner } from "@/components/home/promo-banner/promo-banner";
import { FeaturedBrands } from "@/components/home/featured-brands/featured-brands";
import { FeaturedCategories } from "@/components/home/featured-categories/featured-categories";
import type { FaqEntry } from "@/lib/faq-entry";
import { headingLines } from "@/lib/homepage-sections";
import type { ShopCard } from "@/types/catalogue";
import type { PublishedSection } from "@/types/homepage";

/**
 * One published section → its component. The switch is exhaustive, so a new
 * section type fails the type-check here until it has a component.
 */
export function HomepageSection({
  section,
  faqs,
  products,
}: {
  section: PublishedSection;
  /** The FAQ policy's entries; the FAQ section is omitted when there are none. */
  faqs: FaqEntry[];
  /** The catalogue's newest products; the product shelf is omitted when there are none. */
  products: ShopCard[];
}): ReactNode {
  switch (section.type) {
    case "HERO":
      return <Hero section={section} />;
    case "UPCOMING_DROPS":
      return <UpcomingDrops section={section} />;
    case "BEST_SELLERS":
      return products.length > 0 ? <Featured section={section} products={products} /> : null;
    case "CONDITIONS":
      return <WhatYouHave section={section} />;
    case "TESTIMONIALS":
      return <Stories section={section} />;
    case "FAQ":
      return faqs.length > 0 ? (
        <Faq faqs={faqs} heading={headingLines(section.title)} lede={section.subtitle} />
      ) : null;
    case "INVITATION":
      return <Invitation section={section} />;
    case "PROMO_BANNER":
      return <PromoBanner section={section} />;
    case "FEATURED_BRANDS":
      return <FeaturedBrands section={section} />;
    case "FEATURED_CATEGORIES":
      return <FeaturedCategories section={section} />;
  }
}
