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
  { label: "Upcoming Drops", href: "/", badge: "live" },
  { label: "Shop", href: "/" },
  {
    label: "Categories",
    href: "/",
    panel: {
      wide: true,
      items: getCategories().map((category) => ({
        label: category.name,
        href: "/",
        note: category.note,
      })),
      footer: { label: "Browse the full collection", href: "/" },
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
 *
 * Three of these name a surface the account area does not have —
 * Profile, My Waitlists and Support Tickets pointed at
 * /account/profile, /account/waitlists and /account/support, none of
 * which was ever built. They land on `/account` instead: the overview
 * is the hub every one of them would have been reached through, and
 * the house rule for an unbuilt route is the closest real page rather
 * than a 404 (see `route-map.ts`). Give any of them a page and this is
 * the one line that has to change.
 *
 * Wishlist moved from `/wishlist` to `/account/wishlist`. Both exist,
 * but only the second keeps the account sidebar on screen — dropping a
 * reader out of the account frame mid-session was the older link's one
 * real cost.
 */
export const accountNav: NavItem[] = [
  { label: "My Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "My Waitlists", href: "/account/waitlists" },
  // Points at the Support page's Contact anchor rather than a
  // per-account tickets surface: the site does not have a ticket
  // history view yet, and "Support Tickets" from the account menu is
  // read by shoppers as "how do I reach a person?" more than "list my
  // open tickets". `/support#contact` lands them straight on that
  // block. Swap for `/account/support` if a real ticket list arrives.
  { label: "Support Tickets", href: "/support#contact" },
  { label: "Returns", href: "/account/returns" },
  { label: "Profile", href: "/account" },
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
      { label: "Live Drops", href: "/" },
      { label: "Collection", href: "/" },
      { label: "Archive", href: "/" },
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
      // Sections of `/support`, not routes of their own — see the note
      // on `supportLinks` in `navigation.ts`. These three pointed at
      // /warranty, /shipping and /contact, none of which was ever built.
      { label: "Warranty", href: "/support#warranty" },
      { label: "Shipping & Returns", href: "/support#shipping" },
      { label: "Contact", href: "/support#contact" },
    ],
  },
];
