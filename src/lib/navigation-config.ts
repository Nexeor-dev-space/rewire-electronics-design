import {
  ABOUT_PAGE_PATH,
  ACCOUNT_HOME_PATH,
  CART_PAGE_PATH,
  CATEGORIES_TAB_HREF,
  ORDER_TRACK_PAGE_PATH,
  RELEASES_PAGE_PATH,
  SUPPORT_PAGE_PATH,
  WISHLIST_PAGE_PATH,
} from "@/lib/constants";
import { isSafeHref } from "@/lib/homepage-sections";
import { POLICY_NAV_LABELS, POLICY_ROUTES, POLICY_SLUGS, policyLink } from "@/lib/policy-types";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { supportSections } from "@/lib/support";
import type { NavGroup, NavLinkItem, NavigationConfig } from "@/types/navigation";

/**
 * Navigation defaults, link targets and link checks. Client-safe: the
 * Navigation screen and the storefront read the same file. Rules in
 * docs/NAVIGATION.md.
 */

/* ---------- link targets ---------- */

export interface LinkTarget {
  label: string;
  href: string;
}

export const POLICY_LINK_TARGETS: LinkTarget[] = POLICY_SLUGS.map((slug) => ({
  label: POLICY_NAV_LABELS[slug],
  href: POLICY_ROUTES[slug],
}));

export const PAGE_LINK_TARGETS: LinkTarget[] = [
  { label: "Home", href: "/" },
  { label: "All devices", href: SHOP_INDEX_HREF },
  { label: "Upcoming drops", href: RELEASES_PAGE_PATH },
  { label: "About", href: ABOUT_PAGE_PATH },
  { label: "Support", href: SUPPORT_PAGE_PATH },
  { label: "Contact", href: `${SUPPORT_PAGE_PATH}#contact` },
  { label: "Track order", href: ORDER_TRACK_PAGE_PATH },
  { label: "Cart", href: CART_PAGE_PATH },
  { label: "Wishlist", href: WISHLIST_PAGE_PATH },
  { label: "Account", href: ACCOUNT_HOME_PATH },
];

/** Offered only to a mobile tab: it opens the category list. */
export const CATEGORIES_LINK_TARGET: LinkTarget = {
  label: "Category list (opens a popup)",
  href: CATEGORIES_TAB_HREF,
};

/**
 * Why a link target is refused, or null when it is fine. A site path or an
 * https address; `allowCategories` also accepts the categories tab sentinel.
 */
export function linkTargetError(href: string, allowCategories = false): string | null {
  const value = href.trim();
  if (!value) return "Choose a page or enter an address.";
  if (allowCategories && value === CATEGORIES_TAB_HREF) return null;
  if (!isSafeHref(value)) {
    return "Use a page on this site (starting with /) or a full https:// address.";
  }
  return null;
}

/* ---------- defaults ---------- */

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

const link = (label: string, href: string): NavLinkItem => ({
  id: nextId("link"),
  label,
  href,
  visible: true,
});

const group = (title: string, links: { label: string; href: string }[]): NavGroup => ({
  id: nextId("group"),
  title,
  visible: true,
  links: links.map((item) => link(item.label, item.href)),
});

/**
 * Today's header, footer and mobile bar. This is the first published version.
 * The footer's dead links are corrected: Collection now opens the shop, and
 * the Archive, The Process, Certification and Journal entries, which had no
 * page, are gone. Brand keeps Our Story.
 */
export function defaultNavigation(): NavigationConfig {
  seq = 0;
  return {
    header: {
      aboutColumns: [
        group("The Company", [
          { label: "Our Story", href: ABOUT_PAGE_PATH },
          policyLink("terms-and-conditions"),
          policyLink("privacy-policy"),
        ]),
        group("Help & Policies", supportSections),
      ],
      extraLinks: [],
    },
    footer: {
      columns: [
        group("Shop", [
          { label: "Live Drops", href: RELEASES_PAGE_PATH },
          { label: "Collection", href: SHOP_INDEX_HREF },
        ]),
        group("Brand", [{ label: "Our Story", href: ABOUT_PAGE_PATH }]),
        group("Support", [
          policyLink("warranty"),
          policyLink("shipping"),
          policyLink("returns-refunds-cancellation"),
          { label: "Contact", href: `${SUPPORT_PAGE_PATH}#contact` },
        ]),
      ],
      bottomLinks: [
        link("Privacy", POLICY_ROUTES["privacy-policy"]),
        link("Terms", POLICY_ROUTES["terms-and-conditions"]),
      ],
    },
    mobileBar: {
      tabs: [
        { ...link("Home", "/"), icon: "home" },
        { ...link("Categories", CATEGORIES_TAB_HREF), icon: "categories" },
        { ...link("Cart", CART_PAGE_PATH), icon: "cart" },
        { ...link("Wishlist", WISHLIST_PAGE_PATH), icon: "wishlist" },
        { ...link("Account", ACCOUNT_HOME_PATH), icon: "account" },
      ],
    },
  };
}

/* ---------- what the storefront shows ---------- */

const shownLinks = <T extends NavLinkItem>(links: T[]): T[] => links.filter((item) => item.visible);

const shownGroups = (groups: NavGroup[]): NavGroup[] =>
  groups
    .filter((item) => item.visible)
    .map((item) => ({ ...item, links: shownLinks(item.links) }))
    .filter((item) => item.links.length > 0);

/** Hidden links and empty groups removed. */
export function toPublishedNavigation(config: NavigationConfig): NavigationConfig {
  return {
    header: {
      aboutColumns: shownGroups(config.header.aboutColumns),
      extraLinks: shownLinks(config.header.extraLinks),
    },
    footer: {
      columns: shownGroups(config.footer.columns),
      bottomLinks: shownLinks(config.footer.bottomLinks),
    },
    mobileBar: { tabs: shownLinks(config.mobileBar.tabs) },
  };
}
