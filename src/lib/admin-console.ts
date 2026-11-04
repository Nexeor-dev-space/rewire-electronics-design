/**
 * Admin console configuration — the chrome's copy and the dashboard's
 * tiles.
 *
 * Everything here is layout data, not business data. The dashboard tiles
 * declare what each figure counts and where it leads; the figures come
 * from `GET /api/v1/admin/dashboard`.
 */

import { siteConfig } from "./site";

export const adminConsole = {
  /** Used in the page title; the sidebar head shows the logo image. */
  name: siteConfig.shortName,
  label: "Admin",
} as const;

export type AdminMetricKey = "orders-today" | "live-release" | "open-claims" | "low-stock";

export interface AdminMetric {
  key: AdminMetricKey;
  label: string;
  /** One line saying what the figure counts. */
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
    hint: "Claims not yet closed",
    href: "/admin/service/warranty",
  },
  {
    key: "low-stock",
    label: "Low Stock",
    hint: "Variants below their low stock alert",
    href: "/admin/products",
  },
];

/** Stands in for a figure the viewer cannot see, or that failed to load. */
export const METRIC_PLACEHOLDER = "—";

/** The console's two palettes; no saved choice means follow the OS. */
export const ADMIN_THEMES = ["light", "dark"] as const;
export type AdminTheme = (typeof ADMIN_THEMES)[number];

export function isAdminTheme(value: unknown): value is AdminTheme {
  return ADMIN_THEMES.includes(value as AdminTheme);
}
