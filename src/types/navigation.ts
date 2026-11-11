/** Storefront navigation that staff manage. Rules and limits: docs/NAVIGATION.md. */

export const MOBILE_TAB_ICONS = [
  "home",
  "categories",
  "cart",
  "wishlist",
  "account",
  "drops",
  "info",
  "support",
  "tag",
] as const;
export type MobileTabIcon = (typeof MOBILE_TAB_ICONS)[number];

export interface NavLinkItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
}

export interface NavGroup {
  id: string;
  title: string;
  visible: boolean;
  links: NavLinkItem[];
}

export interface MobileTab extends NavLinkItem {
  icon: MobileTabIcon;
}

export interface NavigationConfig {
  header: {
    /** Columns of the About menu. */
    aboutColumns: NavGroup[];
    /** Top level links beside the product categories, e.g. Drops or Sale. */
    extraLinks: NavLinkItem[];
  };
  footer: {
    columns: NavGroup[];
    /** The small links in the bottom bar, e.g. Privacy and Terms. */
    bottomLinks: NavLinkItem[];
  };
  mobileBar: { tabs: MobileTab[] };
}

/** What the storefront renders: visible links only, empty groups dropped. */
export type PublishedNavigation = NavigationConfig;

/** What the Navigation screen loads and every admin route answers with. */
export interface NavigationDraft {
  draft: NavigationConfig;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  /** True once a publish has replaced a version, so Restore previous has one to bring back. */
  canRestore: boolean;
}
