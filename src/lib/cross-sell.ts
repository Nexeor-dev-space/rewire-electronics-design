import type { Product } from "@/types";
import { getProductBySlug, getProductsByCategory } from "./catalog";

/**
 * Cross-sell — companion products for the Add-to-Cart modal.
 *
 * The rule is one word: contextual. A phone gets earbuds, a watch, and a
 * charger; a laptop gets a sleeve-adjacent accessory, headphones for the
 * commute, and a hub. Never "customers also bought", never a random
 * grid — every card in the modal has to earn its place beside the thing
 * the shopper just chose.
 *
 * The mapping below prefers **specific** slugs when they exist in the
 * catalogue (so the phone flow always shows AirPods Pro if they're in
 * stock), and falls back to the category's best in-stock alternative if
 * the ideal isn't available. Cap two to three cards so the modal never
 * turns into a shelf.
 */

/** Category → prioritised list of companion slugs, best fit first. */
const RECOMMENDATIONS: Record<string, string[]> = {
  phones: [
    "airpods-pro-2",
    "apple-watch-series-8",
    "96w-usb-c-adapter",
    "airpods-max",
    "apple-watch-ultra",
  ],
  laptops: [
    "magic-keyboard-ipad-pro",
    "96w-usb-c-adapter",
    "airpods-max",
    "airpods-pro-2",
    "wh-1000xm4",
  ],
  audio: ["96w-usb-c-adapter", "apple-watch-ultra", "iphone-13", "ipad-air"],
  tablets: [
    "magic-keyboard-ipad-pro",
    "airpods-pro-2",
    "96w-usb-c-adapter",
    "apple-watch-series-8",
  ],
  wearables: [
    "airpods-pro-2",
    "96w-usb-c-adapter",
    "iphone-13",
    "airpods-max",
  ],
  accessories: [
    "iphone-13",
    "airpods-pro-2",
    "ipad-air",
    "apple-watch-series-8",
  ],
};

const DEFAULT_LIMIT = 3;

/**
 * Resolve companion products for the given category, skipping the anchor
 * itself, sold-out stock, and (best-effort) same-category duplicates
 * beyond the first suggestion.
 */
export function getCrossSell(
  anchor: Product,
  limit = DEFAULT_LIMIT,
): Product[] {
  const key = anchor.categorySlug ?? anchor.category.toLowerCase();
  const priority = RECOMMENDATIONS[key] ?? [];

  const picks: Product[] = [];
  const seen = new Set<string>([anchor.slug]);

  for (const slug of priority) {
    if (picks.length >= limit) break;
    if (seen.has(slug)) continue;
    const product = getProductBySlug(slug);
    if (!product) continue;
    if (product.availability === "sold-out") continue;
    picks.push(product);
    seen.add(slug);
  }

  // Fill remaining slots with anything in-stock from the priority
  // categories, respecting the anchor's exclusion set.
  if (picks.length < limit) {
    const backfillCategories = key === "audio" ? ["accessories"] : ["audio"];
    for (const category of backfillCategories) {
      for (const product of getProductsByCategory(category)) {
        if (picks.length >= limit) break;
        if (seen.has(product.slug)) continue;
        if (product.availability === "sold-out") continue;
        picks.push(product);
        seen.add(product.slug);
      }
    }
  }

  return picks;
}
