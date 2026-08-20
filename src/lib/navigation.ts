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
import {
  productHrefForCategory,
  productHrefForDrop,
  SHOP_INDEX_HREF,
} from "./route-map";

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
      { label: "Warranty", href: "/support/warranty" },
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

/* ---------- Support ---------- */

export const supportLinks: MenuLink[] = [
  { label: "FAQ", href: "/support/faq" },
  { label: "Shipping", href: "/support/shipping" },
  { label: "Returns", href: "/support/returns" },
  { label: "Warranty", href: "/support/warranty" },
  { label: "Track Order", href: "/account/orders" },
  { label: "Contact", href: "/contact" },
];

export const supportContact = {
  heading: "Need help?",
  email: "support@rewire-electronics.com",
  chat: { label: "Live Chat", href: "/support/chat" },
  hours: ["Monday – Friday, 9:00 – 18:00 GMT", "Weekend cover during a live drop"],
};

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

export function getDrawerSections(): DrawerSection[] {
  const drops = getUpcomingDrops()
    .slice(0, 4)
    .map((drop) => ({
      label: drop.name,
      href: productHrefForDrop(drop.slug),
      note: drop.edition,
    }));

  const categories = getCategories().map((category) => ({
    label: category.name,
    href: productHrefForCategory(category.slug),
    note: `${category.count} devices`,
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
    { label: "Shop", href: SHOP_INDEX_HREF, items: shopBrowse },
    { label: "Categories", href: SHOP_INDEX_HREF, items: categories },
    {
      label: "About",
      href: "/about",
      items: aboutColumns.flatMap((column) => column.items),
    },
    { label: "Support", href: "/support", items: supportLinks },
  ];
}
