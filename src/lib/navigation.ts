/**
 * Mega-menu content model.
 *
 * Every list here is either literal editorial copy or derived from the
 * catalogue adapters, so the navigation can never drift from what the
 * site actually sells. Swap the getters for CMS queries later without
 * touching a single menu component.
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

export type MegaMenuId = "drops" | "shop" | "categories" | "about" | "support";

export interface MenuLink {
  label: string;
  href: string;
  /** One short line of context. Rendered only where the layout has room. */
  note?: string;
}

export interface PrimaryNavItem {
  label: string;
  href: string;
  /** Present ⇒ the bar renders a disclosure button and opens this menu. */
  menu?: MegaMenuId;
  badge?: "live";
}

export const primaryNav: PrimaryNavItem[] = [
  { label: "Upcoming Drops", href: SHOP_INDEX_HREF, menu: "drops", badge: "live" },
  { label: "Shop", href: SHOP_INDEX_HREF, menu: "shop" },
  { label: "Categories", href: SHOP_INDEX_HREF, menu: "categories" },
  { label: "About", href: "/about", menu: "about" },
  { label: "Support", href: "/support", menu: "support" },
];

/* ---------- Shop ---------- */

export const shopBrowse: MenuLink[] = [
  { label: "All Devices", href: SHOP_INDEX_HREF },
  { label: "Phones", href: productHrefForCategory("phones") },
  { label: "Laptops", href: productHrefForCategory("laptops") },
  { label: "Tablets", href: productHrefForCategory("tablets") },
  { label: "Accessories", href: productHrefForCategory("accessories") },
];

/** Straight to search — these are queries, not catalogue routes. */
export const shopPopular: string[] = [
  "iPhone",
  "MacBook",
  "AirPods",
  "Apple Watch",
  "Samsung",
  "Google Pixel",
];

/* ---------- About ---------- */

export const aboutColumns: { title: string; items: MenuLink[] }[] = [
  {
    title: "The Company",
    items: [
      { label: "The Rewire Standard", href: "/process" },
      { label: "Our Story", href: "/about" },
      { label: "Inspection Process", href: "/process" },
      { label: "Warranty", href: "/support#warranty" },
    ],
  },
  {
    title: "Our Commitments",
    items: [
      { label: "Sustainability", href: "/about/sustainability" },
      { label: "Repairs", href: "/about/repairs" },
      { label: "Certification", href: "/about/certification" },
      { label: "Support", href: "/support" },
    ],
  },
];

export const aboutFeature = {
  image: {
    url: "/images/craft/craft-01.jpg",
    alt: "Macro of the embossed Rewire logotype on a restored chassis",
  },
  title: "Built to be kept.",
  body: "Every device we release has been through the same hands and the same standard.",
  cta: { label: "Learn More", href: "/about" },
};

/* ---------- Support ----------
   Every editorial destination is a section of `/support`, so the hrefs
   are generated from the page's own anchor list rather than typed here.
   The five routes this menu used to name — /support/faq, /shipping,
   /returns, /warranty and /contact — were never built, so each of them
   was a nav item that 404'd. Track Order is the one entry that is not
   editorial: it belongs to the account area and still points there. */

export const supportLinks: MenuLink[] = [
  ...supportSections.map(({ label, href }) => ({ label, href })),
  { label: "Track Order", href: "/account/orders" },
];

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

/** The fixed rail order — the shopper's mental model, not the catalogue's. */
const CATEGORY_ORDER = [
  "phones",
  "laptops",
  "tablets",
  "audio",
  "wearables",
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
 * Head-of-rail links that sit before the category items:
 *   - `shopIndexLink` — the unfiltered catalogue index. Reused as the
 *     "See all X" row inside every category dropdown.
 *   - `upcomingDropsLink` — the calendar of releases. Carries a live
 *     status dot the way the old primary nav did; the destination is
 *     the same as the previous mega-menu entry.
 */
export const shopIndexLink = { label: "Shop", href: SHOP_INDEX_HREF };
export const upcomingDropsLink = {
  label: "Upcoming Drops",
  href: SHOP_INDEX_HREF,
  live: true,
};

/**
 * Editorial links pinned to the right end of the rail. Kept separate
 * from `getCategoryNav()` so the commerce items and the company items
 * are never confused for peers — the layout groups them with
 * `justify-between`.
 */
export const editorialNavLinks = [
  { label: "About", href: "/about" },
  { label: "Support", href: "/support" },
] as const;

/* ---------- Rail dropdowns — compact link lists ----------
   The old primary nav opened full mega panels for Upcoming Drops,
   About and Support; the new rail keeps the disclosure affordance but
   renders each as a compact link list (same shape as the category
   brand dropdowns), so the chrome is one language rather than two. */

/**
 * Upcoming Drops dropdown — one line per release, newest first, plus
 * a "View all" row that lands on the shop index (the same destination
 * the trigger itself points at, so clicking either always works).
 */
export function getUpcomingDropsMenu(): MenuLink[] {
  const drops = getUpcomingDrops()
    .slice(0, 4)
    .map((drop) => ({
      label: drop.name,
      href: productHrefForDrop(drop.slug),
      note: drop.edition,
    }));
  return [...drops, { label: "View all releases", href: SHOP_INDEX_HREF }];
}

/**
 * About dropdown — the two "The Company" and "Our Commitments" columns
 * flattened into one list. Kept compact by design; the full editorial
 * layout lives on `/about` itself.
 */
export const aboutMenuLinks: MenuLink[] = aboutColumns.flatMap(
  (column) => column.items,
);

/** Support dropdown — every editorial section of `/support`, plus Track Order. */
export const supportMenuLinks: MenuLink[] = supportLinks;

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
  wearables: [
    "M9.25 8.25h5.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75V9a.75.75 0 0 1 .75-.75Z",
    "M9.9 8.25 10.15 4.25h3.7l.25 4",
    "M9.9 15.75l.25 4h3.7l.25-4",
  ],
  audio: [
    "M4.75 13.25v-1.5a7.25 7.25 0 0 1 14.5 0v1.5",
    "M4.75 13.25h1.6a1.1 1.1 0 0 1 1.1 1.1v3.3a1.1 1.1 0 0 1-1.1 1.1h-1.6Z",
    "M19.25 13.25h-1.6a1.1 1.1 0 0 0-1.1 1.1v3.3a1.1 1.1 0 0 0 1.1 1.1h1.6Z",
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
 * then About and Support. The previous generic "Shop" and "Categories"
 * accordions are gone — the desktop bar has no such items, and a
 * shopper moving between a phone and a laptop should meet the same
 * navigation vocabulary on both.
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
      label: "About",
      href: "/about",
      items: aboutColumns.flatMap((column) => column.items),
    },
    { label: "Support", href: "/support", items: supportLinks },
  ];
}
