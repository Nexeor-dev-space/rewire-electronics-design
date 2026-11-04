import { policyLink } from "./policy-types";

export const siteConfig = {
  name: "Rewire Electronics",
  shortName: "Rewire",
  tagline: "Exceptional technology. Second life. First class.",
  description:
    "Rewire Electronics launches exclusive, certified-renewed electronics through limited drops. Premium devices, obsessively restored, released in numbered editions.",
  url: "https://rewire-electronics.com",
  ogImage: "/images/rewire-img.jpg",
  favicon: "/images/rewire-fav.png",
  locale: "en_US",
} as const;

/**
 * The Rewire logo (REWIRE. over ELECTRONICS), as transparent PNGs cut from
 * the brand files. `onDark` has white ink for dark grounds (the storefront),
 * `onLight` has black ink for light grounds (the light admin, invoices).
 * Drawn only by `components/layout/logo.tsx` and the invoice PDF.
 */
export const brandLogo = {
  onDark: "/images/brand/rewire-logo-on-dark.png",
  onLight: "/images/brand/rewire-logo-on-light.png",
  width: 395,
  height: 101,
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

export const accountNav: NavItem[] = [
  { label: "My Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "My Waitlists", href: "/account/waitlists" },
  { label: "Support Tickets", href: "/support#contact" },
  { label: "Returns", href: "/account/returns" },
  { label: "Profile", href: "/account/settings" },
];

/** The one wording for every search entry point: header, panel, mobile drawer. */
export const searchCopy = {
  label: "Search products, brands and devices",
  placeholder: "Search products, brands & devices",
} as const;

export const SEARCH_PAGE_PATH = "/search";

export const searchHref = (q: string) => `${SEARCH_PAGE_PATH}?q=${encodeURIComponent(q.trim())}`;

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
