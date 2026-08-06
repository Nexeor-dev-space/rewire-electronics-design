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
};

/** Primary navigation — intentionally short. Luxury brands don't crowd their nav. */
export const mainNav: NavItem[] = [
  { label: "Drops", href: "/drops", badge: "live" },
  { label: "Collection", href: "/collection" },
  { label: "The Process", href: "/process" },
  { label: "Journal", href: "/journal" },
];

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
