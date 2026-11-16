import type { ReactNode } from "react";
import { Hero } from "@/components/home/hero/hero";
import { UpcomingDrops } from "@/components/home/upcoming-drops/upcoming-drops";
import { Featured } from "@/components/home/featured/featured";
import { WhatYouHave } from "@/components/home/conditions/what-you-have";
import { Stories } from "@/components/home/stories/stories";
import { Invitation } from "@/components/home/invitation/invitation";
import { PromoBanner } from "@/components/home/promo-banner/promo-banner";
import { FeaturedBrands } from "@/components/home/featured-brands/featured-brands";
import { FeaturedCategories } from "@/components/home/featured-categories/featured-categories";
import { DealsSection } from "@/components/home/deals/deals-section";
import type { ShopCard } from "@/types/catalogue";
import type { PublishedSection } from "@/types/homepage";

/**
 * One published section → its component. The switch is exhaustive, so a new
 * section type fails the type-check here until it has a component.
 */
export function HomepageSection({
  section,
  products,
}: {
  section: PublishedSection;
  /** The catalogue's newest products, for a Just Listed shelf with no picks. */
  products: ShopCard[];
}): ReactNode {
  switch (section.type) {
    case "HERO":
      return <Hero section={section} />;
    case "UPCOMING_DROPS":
      return <UpcomingDrops section={section} />;
    case "BEST_SELLERS": {
      // Just Listed: staff picks when any can be bought, else the newest
      // products. The shelf is omitted when both are empty.
      const shelf = section.products.length > 0 ? section.products : products;
      return shelf.length > 0 ? <Featured section={section} products={shelf} /> : null;
    }
    case "CONDITIONS":
      return <WhatYouHave section={section} />;
    case "TESTIMONIALS":
      return <Stories section={section} />;
    case "FAQ":
      // The FAQ lives on the About page now; the stored section is kept so
      // no data changes, but the homepage no longer renders it.
      return null;
    case "INVITATION":
      return <Invitation section={section} />;
    case "PROMO_BANNER":
      return <PromoBanner section={section} />;
    case "FEATURED_BRANDS":
      return <FeaturedBrands section={section} />;
    case "FEATURED_CATEGORIES":
      return <FeaturedCategories section={section} />;
    case "BEST_DEALS":
      return section.products.length > 0 ? (
        <DealsSection
          section={section}
          deals={section.products.map((card) => ({ kind: "product", id: card.id, card }))}
        />
      ) : null;
    case "SEASON_DEALS":
      return <DealsSection section={section} deals={section.deals} />;
  }
}
