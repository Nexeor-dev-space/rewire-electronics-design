import { getCategories } from "./categories";

/**
 * Central site configuration — single source of truth for brand,
 * navigation, and SEO defaults. Swap values here, not in components.
 */

export const siteConfig = {
  name: "Rewire Electronics",
  shortName: "Rewire",
  tagline: "Exceptional technology. Second life. First class.",
  description:
    "Rewire Electronics launches exclusive, certified-renewed electronics through limited drops. Premium devices, obsessively restored, released in numbered editions.",
  url: "https://rewire-electronics.com",
  ogImage: "/images/og-default.jpg",
  locale: "en_US",
} as const;

export type NavItem = {
  label: string;
  href: string;
  /** Optional signal shown next to the label (e.g. live drop indicator). */
  badge?: "live" | "new";
  /** One line of context. Panels only — never rendered in the bar. */
  note?: string;
};

export interface NavPanel {
  items: NavItem[];
  /** Two columns instead of one — for the category mega menu. */
  wide?: boolean;
  /** Optional closing link along the panel's foot. */
  footer?: NavItem;
}

export interface PrimaryNavItem extends NavItem {
  /**
   * Present ⇒ the bar renders a disclosure button instead of a link, and
   * this panel opens beneath it. `href` stays the destination its mobile
   * accordion header links to.
   */
  panel?: NavPanel;
}

/**
 * Primary navigation — intentionally short. Luxury brands don't crowd
 * their nav. Category links are derived from the catalogue adapter so
 * the menu and the homepage gallery can never drift apart.
 */
export const mainNav: PrimaryNavItem[] = [
  { label: "Upcoming Drops", href: "/drops", badge: "live" },
  { label: "Shop", href: "/collection" },
  {
    label: "Categories",
    href: "/collection",
    panel: {
      wide: true,
      items: getCategories().map((category) => ({
        label: category.name,
        href: `/collection/${category.slug}`,
        note: category.note,
      })),
      footer: { label: "Browse the full collection", href: "/collection" },
    },
  },
  { label: "How It Works", href: "/process" },
  {
    label: "Support",
    href: "/support",
    panel: {
      items: [
        { label: "FAQ", href: "/support/faq" },
        { label: "Warranty", href: "/support/warranty" },
        { label: "Shipping", href: "/support/shipping" },
        { label: "Returns", href: "/support/returns" },
        { label: "Contact", href: "/contact" },
      ],
    },
  },
];

/**
 * The signed-in account menu — the customer's half of the journey.
 * Order follows how often each is reached after a drop: orders first,
 * waitlists next, then the support surfaces, then the profile itself.
 * Logout is rendered separately, below a divider, and is never a link.
 */
export const accountNav: NavItem[] = [
  { label: "My Orders", href: "/account/orders" },
  { label: "My Waitlists", href: "/account/waitlists" },
  { label: "Support Tickets", href: "/account/support" },
  { label: "Returns", href: "/account/returns" },
  { label: "Profile", href: "/account/profile" },
];

/** Seeds the empty search overlay so it never opens as a blank box. */
export const searchSuggestions = [
  "iPhone",
  "MacBook",
  "AirPods",
  "Samsung",
  "Apple Watch",
] as const;

export const footerNav: { title: string; items: NavItem[] }[] = [
  {
    title: "Shop",
    items: [
      { label: "Live Drops", href: "/drops" },
      { label: "Collection", href: "/collection" },
      { label: "Archive", href: "/archive" },
    ],
  },
  {
    title: "Brand",
    items: [
      { label: "The Process", href: "/process" },
      { label: "Certification", href: "/certification" },
      { label: "Journal", href: "/journal" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Warranty", href: "/warranty" },
      { label: "Shipping & Returns", href: "/shipping" },
      { label: "Contact", href: "/contact" },
    ],
  },
];
