/**
 * Mega-menu content model.
 *
 * Every list here is either literal editorial copy or derived from the
 * catalogue adapters, so the navigation can never drift from what the
 * site actually sells. Swap the getters for CMS queries later without
 * touching a single menu component.
 *
 * Two shapes the whole navigation now holds to:
 *
 *  - **Four product families.** Smartphones, Laptops, Tablets and
 *    Accessories, declared once in `categories.ts` and ordered once in
 *    `CATEGORY_ORDER` below. Audio and Wearables are stocked and
 *    browsable but are no longer navigation destinations.
 *  - **One editorial heading.** About, which absorbed Support.
 */

import { getUpcomingDrops } from "./drops";
import { getCategories } from "./categories";
import { getAllProducts, getProductsByCategory } from "./catalog";
import {
  productHrefForCategory,
  productHrefForDrop,
  SHOP_INDEX_HREF,
} from "./route-map";
import { supportContact, supportSections } from "./support";

export type MegaMenuId = "drops" | "shop" | "categories" | "about";

export interface MenuLink {
  label: string;
  href: string;
  /** One short line of context. Rendered only where the layout has room. */
  note?: string;
}

/* ---------- Shop ---------- */

export const shopBrowse: MenuLink[] = [
  { label: "All Devices", href: SHOP_INDEX_HREF },
  { label: "Smartphones", href: productHrefForCategory("phones") },
  { label: "Laptops", href: productHrefForCategory("laptops") },
  { label: "Tablets", href: productHrefForCategory("tablets") },
  { label: "Accessories", href: productHrefForCategory("accessories") },
];

/** Straight to the pre-filtered shelf — these are queries, not routes. */
export const shopPopular: string[] = [
  "iPhone",
  "MacBook",
  "iPad",
  "Samsung",
  "Google Pixel",
  "Dell",
];

/* ---------- About — the one editorial heading ----------
   About and Support used to be two triggers on the bar opening two
   panels. They are one now. A shopper looking for the returns window
   and a reader looking for the company's story were being asked to
   guess which of two headings owned "Warranty" — and Support's own
   panel already linked back to About while About's linked forward to
   Support, which is the shape of a split that should never have been
   made.

   Every `/support#…` href is generated from the support page's own
   anchor list (`supportSections`), so a section cannot be renamed into
   a dead nav link. Only the wording differs in one place: the page
   heads that section "Returns" and the menu says it in full.

   Track Order is deliberately *not* here. It is account navigation,
   not editorial, and it now lives under the profile icon with the rest
   of the customer's own surfaces. */

/** Where the menu says a support section longer than the page does. */
const ABOUT_LABEL_OVERRIDES: Record<string, string> = {
  Returns: "Returns, Refunds & Cancellation",
};

const supportSectionLinks: MenuLink[] = supportSections.map(
  ({ label, href }) => ({ label: ABOUT_LABEL_OVERRIDES[label] ?? label, href }),
);

export const aboutColumns: { title: string; items: MenuLink[] }[] = [
  {
    title: "The Company",
    items: [
      { label: "Our Story", href: "/about" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
  {
    title: "Help & Policies",
    items: supportSectionLinks,
  },
];

/** Flattened — the mobile drawer renders About as one list, not two. */
export const aboutMenuLinks: MenuLink[] = aboutColumns.flatMap(
  (column) => column.items,
);

export { supportContact };

/* ---------- Category nav — the secondary rail's data model ----------
   Ordered category list with per-category "browse by brand" submenus,
   derived at read time from the catalogue itself so a new device (or a
   discontinued brand) shows up in the nav without a second data source
   to keep in step. */

export interface CategoryNavItem {
  /** Display label — matches the catalogue's own name. */
  label: string;
  /** Route slug — used with `productHrefForCategory`. */
  slug: string;
  href: string;
  /**
   * Submenu of brand-filtered links. Present only when the category has
   * more than one distinct brand *and* more than one product per brand —
   * a category with two Apple items alone earns no dropdown. Empty when
   * the category link should be a straight-through anchor.
   */
  brands: { label: string; href: string; count: number }[];
}

/**
 * The fixed rail order — the shopper's mental model, not the
 * catalogue's, and the storefront's four primary families in the order
 * `categories.ts` declares them.
 *
 * Audio and Wearables were dropped from the rail. Their stock is still
 * in the catalogue and still browsable and filterable on `/collection`;
 * they are simply no longer top-level navigation. Reinstate a family by
 * adding it back to `categories.ts` and to this list — both, so the
 * label and the rail can never disagree.
 */
const CATEGORY_ORDER = [
  "phones",
  "laptops",
  "tablets",
  "accessories",
] as const;

export function getCategoryNav(): CategoryNavItem[] {
  const catalogueOrder = new Map(
    getCategories().map((c) => [c.slug, c.name]),
  );

  return CATEGORY_ORDER.map((slug): CategoryNavItem => {
    const label = catalogueOrder.get(slug) ?? slug;
    const products = getProductsByCategory(slug);
    // A brand only earns a submenu entry when the category actually has
    // stock under it. Sold-out lines still count (they are still in the
    // catalogue), but count is exposed for the UI to weight the row.
    const grouped = new Map<string, number>();
    for (const product of products) {
      grouped.set(product.brand, (grouped.get(product.brand) ?? 0) + 1);
    }
    const brands = Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([brand, count]) => ({
        label: brand,
        count,
        href: `${productHrefForCategory(slug)}?brand=${encodeURIComponent(brand)}`,
      }));

    return {
      label,
      slug,
      href: productHrefForCategory(slug),
      // Suppress the dropdown when there is only one brand — a menu that
      // opens to one item is a menu that does not need to open.
      brands: brands.length > 1 ? brands : [],
    };
  });
}

/** True when the shopper's route is under this category's listing. */
export function categoryNavIsActive(pathname: string, slug: string): boolean {
  return (
    pathname === productHrefForCategory(slug) ||
    pathname.startsWith(`${productHrefForCategory(slug)}/`)
  );
}

/**
 * The calendar of releases, pinned to the head of the rail. Carries a
 * live status dot; the destination is the shop index.
 */
export const upcomingDropsLink = {
  label: "Upcoming Drops",
  href: SHOP_INDEX_HREF,
  live: true,
};

/**
 * The editorial link at the right end of the rail. One heading, not
 * two — Support was merged into About (see `aboutColumns`), so the bar
 * carries a single company destination rather than asking the shopper
 * which of two owns the warranty policy.
 */
export const editorialNavLink = { label: "About", href: "/about" } as const;

// The full catalogue accessor is re-used by the mobile drawer accordion.
export { getAllProducts };

/* ---------- Category glyphs ----------
   Raw `d` strings on a 24×24 grid, single weight, no fills — the house
   icon convention. Keyed by catalogue slug so a new category simply
   needs a glyph added here. */

export const categoryGlyphs: Record<string, string[]> = {
  phones: [
    "M8.5 3.25h7a1.75 1.75 0 0 1 1.75 1.75v14a1.75 1.75 0 0 1-1.75 1.75h-7A1.75 1.75 0 0 1 6.75 19V5A1.75 1.75 0 0 1 8.5 3.25Z",
    "M10.75 6.25h2.5",
  ],
  laptops: [
    "M6.25 6.5h11.5a.5.5 0 0 1 .5.5v8.25H5.75V7a.5.5 0 0 1 .5-.5Z",
    "M3.25 18.25h17.5",
  ],
  tablets: [
    "M6.5 3.75h11a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.75V5.25a1.5 1.5 0 0 1 1.5-1.5Z",
    "M10.75 17.25h2.5",
  ],
  accessories: [
    "M9 3.75v4.5",
    "M15 3.75v4.5",
    "M7.25 8.25h9.5v2.75a4.75 4.75 0 0 1-9.5 0V8.25Z",
    "M12 15.75v4.5",
  ],
};

/* ---------- Mobile ----------
   The drawer's accordions are derived from exactly the sources the mega
   panels use, so the two navigations can never disagree about what the
   site contains. */

export interface DrawerSection {
  label: string;
  href: string;
  badge?: "live";
  items: MenuLink[];
}

/**
 * The drawer mirrors the desktop `CategoryBar`, row for row: Upcoming
 * Drops, then one row per catalogue category (in the same rail order),
 * then About. The previous generic "Shop" and "Categories" accordions
 * are gone — the desktop bar has no such items, and a shopper moving
 * between a phone and a laptop should meet the same navigation
 * vocabulary on both. Support is gone for the same reason: it is one
 * heading with About on desktop now, so it is one row here.
 *
 * Nothing account-shaped appears in this list. The customer's own
 * surfaces — orders, wishlist, waitlists, returns, tracking — sit
 * behind the profile icon in `MobileTabBar`, which is the one place a
 * tap is required to reveal them.
 *
 * A category with brand submenus becomes an accordion whose children
 * are the same brand-filtered links the desktop dropdown carries, plus
 * the "All …" row. A category without brands (`items: []`) renders in
 * the drawer as a plain link row — one tap, no empty accordion.
 */
export function getDrawerSections(): DrawerSection[] {
  const drops = getUpcomingDrops()
    .slice(0, 4)
    .map((drop) => ({
      label: drop.name,
      href: productHrefForDrop(drop.slug),
      note: drop.edition,
    }));

  const categories: DrawerSection[] = getCategoryNav().map((item) => ({
    label: item.label,
    href: item.href,
    items:
      item.brands.length > 0
        ? [
            ...item.brands.map((brand) => ({
              label: brand.label,
              href: brand.href,
              note: String(brand.count),
            })),
            { label: `All ${item.label.toLowerCase()}`, href: item.href },
          ]
        : [],
  }));

  return [
    {
      label: "Upcoming Drops",
      href: SHOP_INDEX_HREF,
      badge: "live",
      items: [
        ...drops,
        { label: "View all upcoming drops", href: SHOP_INDEX_HREF },
      ],
    },
    ...categories,
    {
      label: editorialNavLink.label,
      href: editorialNavLink.href,
      items: aboutMenuLinks,
    },
  ];
}
