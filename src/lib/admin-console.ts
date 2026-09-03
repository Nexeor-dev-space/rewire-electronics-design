/**
 * Admin console configuration — the chrome's copy and the dashboard's
 * placeholder tiles.
 *
 * Everything here is layout data, not business data. The dashboard tiles
 * declare what the console will report on and where each figure leads;
 * the figures themselves stay blank until the APIs behind them exist, so
 * nothing on this screen can quietly become a fake number.
 */

import { siteConfig } from "./site";

export const adminConsole = {
  /** Wordmark in the sidebar head. Follows the storefront's brand name. */
  name: siteConfig.shortName,
  label: "Admin",
  /**
   * Placeholder staff identity for the header menu. Admin authentication
   * is a separate issue; this is deliberately static rather than wired to
   * the shopper session, which is a different account entirely.
   */
  staff: {
    name: "Staff Account",
    role: "Administrator",
  },
} as const;

export interface AdminMetric {
  key: string;
  label: string;
  /** One line saying what the figure will count once it is wired up. */
  hint: string;
  /** The module that owns the figure. */
  href: string;
}

/**
 * The four operational indicators the dashboard opens with. Reporting
 * and analytics are explicitly out of scope: these are the "what needs
 * me today" signals, each a doorway into its module.
 */
export const adminMetrics: AdminMetric[] = [
  {
    key: "orders-today",
    label: "Orders Today",
    hint: "Orders placed since midnight",
    href: "/admin/orders",
  },
  {
    key: "live-release",
    label: "Live Release",
    hint: "The release currently on sale",
    href: "/admin/releases",
  },
  {
    key: "open-claims",
    label: "Open Warranty Claims",
    hint: "Claims awaiting a decision",
    href: "/admin/service/warranty",
  },
  {
    key: "low-stock",
    label: "Low Stock",
    hint: "Variants below their stock threshold",
    href: "/admin/products/inventory",
  },
];

/** Stands in for a figure whose API does not exist yet. */
export const METRIC_PLACEHOLDER = "—";
