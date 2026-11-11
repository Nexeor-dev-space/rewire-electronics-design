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

/** A built-in piece of the header or footer that staff can only show, hide and order. */
export interface NavPart<Id extends string = string> {
  id: Id;
  visible: boolean;
}

export const TOP_BAR_PARTS = ["logo", "search", "account", "cart"] as const;
export const RAIL_PARTS = ["categories", "drops", "about"] as const;
export const FOOTER_TOP_PARTS = ["brand", "columns"] as const;
export const FOOTER_BASE_PARTS = ["bottomBar", "watermark"] as const;
export type TopBarPartId = (typeof TOP_BAR_PARTS)[number];
export type RailPartId = (typeof RAIL_PARTS)[number];
export type FooterTopPartId = (typeof FOOTER_TOP_PARTS)[number];
export type FooterBasePartId = (typeof FOOTER_BASE_PARTS)[number];

/** One entry of the header rail: a built-in menu or a link staff added. */
export type RailItem = NavPart<RailPartId> | NavLinkItem;

export interface NavigationConfig {
  header: {
    /** The top row: logo, search, account, cart, in the order shown. */
    topBar: NavPart<TopBarPartId>[];
    /** The rail under it: Categories, Upcoming Drops, About and added links, in order. */
    rail: RailItem[];
    /** Columns of the About menu. */
    aboutColumns: NavGroup[];
    /** Order and visibility of categories. A category not listed shows, after the listed ones. */
    categories: NavPart[];
    /** Order and visibility of upcoming drops, by release id. Same rule as categories. */
    drops: NavPart[];
  };
  footer: {
    /** The top row: the brand block and the link columns. */
    top: NavPart<FooterTopPartId>[];
    /** The base: the bottom bar and the large watermark. */
    base: NavPart<FooterBasePartId>[];
    columns: NavGroup[];
    /** The small links in the bottom bar, e.g. Privacy and Terms. */
    bottomLinks: NavLinkItem[];
  };
  mobileBar: { tabs: MobileTab[] };
}

/** What the storefront renders: visible links only, empty groups dropped. */
export type PublishedNavigation = NavigationConfig;

/** One category or upcoming drop staff can show, hide and order. */
export interface NavOption {
  id: string;
  name: string;
}

/** What the category and upcoming drop pages list: what the storefront could show. */
export interface NavigationOptions {
  categories: NavOption[];
  drops: NavOption[];
}

/** What the Navigation screen loads and every admin route answers with. */
export interface NavigationDraft {
  draft: NavigationConfig;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  /** True once a publish has replaced a version, so Restore previous has one to bring back. */
  canRestore: boolean;
}
