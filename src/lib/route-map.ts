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

/** Every catalogue product slug. Kept literal so a rename in `@/lib/catalog`
 *  surfaces as a compile-time miss here rather than a silent 404. */
const CATALOG_FALLBACK = "iphone-14-pro";

/**
 * Drop slug → the closest catalogue product. The catalogue in
 * `@/lib/catalog` is the only route that renders a product page, so a
 * drop tile that would have opened /drops/[slug] opens the matching
 * catalogue detail page instead.
 */
const DROP_TO_PRODUCT: Record<string, string> = {
  // Hero — live/next drop
  "drop-004-halo-edit": "iphone-14-pro",
  "drop-005-signal-edit": "iphone-15-pro-max",

  // Live-drop device carousel (drops.ts → liveDrop.devices)
  "orbit-watch-s": "apple-watch-series-8",

  // Upcoming drops (drops.ts → upcomingDrops)
  "signal-phone-pro": "iphone-15-pro-max",
  "meridian-book-14": "macbook-pro-14-m1-pro",
  "aria-studio-headphones": "wh-1000xm4",
  "pulse-watch-s": "apple-watch-series-8",
  "atlas-tab-11": "ipad-pro-11-m2",

  // Past drops (drops.ts → pastDrops)
  "halo-phone-pro-drop-003": "iphone-14-pro",
  "atlas-book-15-drop-003": "macbook-air-13-m2",
  "nova-buds-pro-drop-002": "airpods-pro-2",
  "orbit-watch-classic-drop-002": "apple-watch-series-8",

  // Featured products (products.ts) that are surfaced with the drop
  // link scheme even though they belong to the everyday catalogue.
  "halo-phone-pro": "iphone-14-pro",
  "atlas-book-15": "macbook-air-13-m2",
  "echo-studio": "wh-1000xm4",
  "orbit-watch-classic": "apple-watch-series-8",
  "vector-book-13": "macbook-pro-14-m1-pro",
  "aria-studio-buds": "airpods-pro-2",
  "field-case-pro": "magic-keyboard-ipad-pro",
  "anchor-charger-65w": "96w-usb-c-adapter",
  "transit-sleeve-15": "magic-keyboard-ipad-pro",
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
