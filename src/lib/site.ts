import { getCategories } from "./categories";
import { policyLink } from "./policy-types";

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
  badge?: "live" | "new";
  note?: string;
};

export interface NavPanel {
  items: NavItem[];
  wide?: boolean;
  footer?: NavItem;
}

export interface PrimaryNavItem extends NavItem {
  panel?: NavPanel;
}

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
        policyLink("faq"),
        policyLink("warranty"),
        policyLink("shipping"),
        policyLink("returns-refunds-cancellation"),
        { label: "Contact", href: "/support#contact" },
      ],
    },
  },
];

export const accountNav: NavItem[] = [
  { label: "My Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "My Waitlists", href: "/account/waitlists" },
  { label: "Support Tickets", href: "/support#contact" },
  { label: "Returns", href: "/account/returns" },
  { label: "Profile", href: "/account" },
];

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
      policyLink("warranty"),
      policyLink("shipping"),
      policyLink("returns-refunds-cancellation"),
      { label: "Contact", href: "/support#contact" },
    ],
  },
];
