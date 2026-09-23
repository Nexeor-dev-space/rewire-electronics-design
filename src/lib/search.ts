import type { StorefrontCategory } from "@/types/catalogue";
import { getUpcomingDrops, type UpcomingDrop } from "./drops";

/**
 * Search adapter. Everything the panel offers is derived from the same
 * catalogue adapters the nav and the homepage use, so the suggestions can
 * never drift from what the site actually sells. Swap the bodies for a
 * real query later without touching the panel.
 */

/** Seeds the panel so it never opens as a blank box. */
export const quickSearches = [
  "iPhone",
  "MacBook",
  "AirPods",
  "Samsung",
  "Apple Watch",
  "iPad",
] as const;

/** How many drops the third column shows at rest. */
const RECENT_DROPS = 3;

export interface SearchResults {
  terms: string[];
  categories: StorefrontCategory[];
  drops: UpcomingDrop[];
  /** Query entered, nothing matched anywhere. */
  empty: boolean;
}

export function searchCatalogue(
  query: string,
  allCategories: StorefrontCategory[],
): SearchResults {
  const q = query.trim().toLowerCase();
  const allDrops = getUpcomingDrops();

  if (!q) {
    return {
      terms: [...quickSearches],
      categories: allCategories,
      drops: allDrops.slice(0, RECENT_DROPS),
      empty: false,
    };
  }

  const terms = quickSearches.filter((term) =>
    term.toLowerCase().includes(q),
  );
  const categories = allCategories.filter(
    (category) =>
      category.name.toLowerCase().includes(q) ||
      category.description.toLowerCase().includes(q),
  );
  const drops = allDrops
    .filter((drop) =>
      `${drop.name} ${drop.variant} ${drop.edition}`.toLowerCase().includes(q),
    )
    .slice(0, RECENT_DROPS);

  return {
    terms,
    categories,
    drops,
    empty: !terms.length && !categories.length && !drops.length,
  };
}
