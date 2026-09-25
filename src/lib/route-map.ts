/**
 * Legacy-route → real-route mapping.
 *
 * The design was built against three route families that never landed:
 *   /shop            — a catalogue index
 *   /collection/*    — category listings
 *   /drops/[slug]    — a drop's own archive page
 *
 * Only /product/[slug] and /cart exist today. Every link that would have
 * pointed at one of the missing routes routes through here so the click
 * lands on the closest real page instead of the 404. Delete the whole
 * file once the /shop and /drops routes are built and update the call
 * sites back to their intended hrefs.
 */

const CATALOG_FALLBACK = "apple-iphone-14-pro";

const DROP_TO_PRODUCT: Record<string, string> = {
  "drop-004-halo-edit": "apple-iphone-14-pro",
  "drop-005-signal-edit": "apple-iphone-15-pro-max",

  "orbit-watch-s": "apple-watch-series-8",
  "halo-phone-pro": "apple-iphone-14-pro",
  "vector-book-13": "apple-macbook-pro-14-m1-pro",
  "echo-studio": "sony-wh-1000xm4",

  "signal-phone-pro": "apple-iphone-15-pro-max",
  "meridian-book-14": "apple-macbook-pro-14-m1-pro",
  "aria-studio-headphones": "sony-wh-1000xm4",
  "pulse-watch-s": "apple-watch-series-8",
  "atlas-tab-11": "apple-ipad-pro-11-m2",

  "halo-phone-pro-drop-003": "apple-iphone-14-pro",
  "atlas-book-15-drop-003": "apple-macbook-air-13-m2",
  "nova-buds-pro-drop-002": "apple-airpods-pro-2nd-gen",
  "orbit-watch-classic-drop-002": "apple-watch-series-8",
};

/* `CATEGORY_TO_FIRST_PRODUCT` used to live here, sending category links to
   one arbitrary product because /collection/* did not exist. It does now,
   so the map is gone and `productHrefForCategory` below points at the real
   listing. */

/** Product href for a drop slug — always resolves, never 404s. */
export function productHrefForDrop(dropSlug: string): string {
  return `/product/${DROP_TO_PRODUCT[dropSlug] ?? CATALOG_FALLBACK}`;
}

/**
 * Category href. `/collection/[category]` exists now, so this points at
 * the real listing rather than bouncing to one arbitrary product.
 *
 * The shop resolves older category vocabularies itself — `phones` maps to
 * Smartphones, `wearables` to Smartwatches — so every slug already in use
 * here lands on the correct pre-filtered view.
 */
export function productHrefForCategory(categorySlug: string): string {
  return `/collection/${categorySlug}`;
}

/** Where the Shop / Collection index links point. */
export const SHOP_INDEX_HREF = "/collection";
