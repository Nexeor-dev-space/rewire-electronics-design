/**
 * Admin navigation — the single source of truth for the admin panel's
 * information architecture.
 *
 * Every admin surface is declared here once: its label, its route, the
 * one line of copy the placeholder page shows, and the permission key a
 * future staff/role system will check. The sidebar, the breadcrumbs and
 * the placeholder route all read from this file, so adding, removing or
 * reordering a module means editing this list and nothing else.
 *
 * Route resolution deliberately treats every declared route as owning
 * its descendants: `/admin/orders` owns `/admin/orders/1042`, and
 * `/admin/products` owns `/admin/products/add`. That is what keeps the
 * parent nav row active on a child page without each child route having
 * to be declared. A more specific declaration always wins, which is how
 * `/admin/products/inventory` can be its own nav item while still living
 * underneath the Products route.
 */

/** Root of the admin panel. Every admin route hangs off this. */
export const ADMIN_ROOT = "/admin";

/**
 * The eight operational areas of the console. Staff access is granted by
 * area, so this is the coarse half of the future permission key.
 */
export type AdminArea =
  | "overview"
  | "catalogue"
  | "storefront"
  | "sales"
  | "service"
  | "marketing"
  | "integrations"
  | "governance";

export interface AdminNavItem {
  /** Unique within its area. Forms the second half of the permission key. */
  key: string;
  label: string;
  href: string;
  /** One line of context, shown on the module's placeholder page. */
  description: string;
  /**
   * Extra routes this item owns beyond `href` and its descendants — for
   * the modules whose surfaces do not share a single path prefix (claims
   * sitting beside warranty, roles beside users).
   */
  routes?: string[];
  /** Secondary rows nested under this one, e.g. Trash → Products / Users. */
  children?: AdminNavItem[];
}

export interface AdminNavSection {
  area: AdminArea;
  label: string;
  /** Section glyph — raw `d` strings on a 24×24 grid, house icon convention. */
  glyph: string[];
  items: AdminNavItem[];
}

/**
 * Permission key for a navigation row: `area.key`.
 *
 * Nothing checks these yet — this issue deliberately ships no RBAC. They
 * exist so the future staff permission system can filter the navigation,
 * gate the routes and disable edit actions without the navigation model
 * having to change shape.
 */
export function adminPermission(area: AdminArea, key: string): string {
  return `${area}.${key}`;
}

export const adminNav: AdminNavSection[] = [
  {
    area: "overview",
    label: "Overview",
    glyph: ["M4 12l8-8 8 8", "M6 10v9h4v-5h4v5h4v-9"],
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        href: ADMIN_ROOT,
        description:
          "Today's operational picture: orders taken, the release on sale, warranty claims waiting and stock running short.",
      },
    ],
  },
  {
    area: "catalogue",
    label: "Catalogue",
    glyph: [
      "M4.75 6.5h14.5v11.75H4.75z",
      "M4.75 10.25h14.5",
      "M9.75 10.25v8",
    ],
    items: [
      {
        key: "products",
        label: "Products",
        href: "/admin/products",
        description:
          "Product information, variants, images and specifications. Variants carry storage, colour, condition, price and stock.",
      },
      {
        key: "categories",
        label: "Categories",
        href: "/admin/categories",
        description: "The category tree the storefront and the feeds both read.",
      },
      {
        key: "brands",
        label: "Brands",
        href: "/admin/brands",
        description: "Brand records, logos and the brand pages they drive.",
      },
      {
        key: "bulk-upload",
        label: "Bulk Product Upload",
        href: "/admin/products/upload-products",
        description:
          "Spreadsheet import for products and variants, with a history of every run and its outcome.",
        routes: ["/admin/products/upload-history"],
      },
      {
        key: "inventory",
        label: "Inventory",
        href: "/admin/products/inventory",
        description:
          "Stock on hand per variant, low stock thresholds and adjustments.",
      },
      {
        key: "add-ons",
        label: "Add-ons",
        href: "/admin/add-ons",
        description:
          "Optional extras offered alongside a device: cases, chargers, extended cover.",
      },
      {
        key: "devices",
        label: "Device Registry",
        href: "/admin/devices",
        description:
          "The individual device record, keyed by serial or IMEI. Warranty entitlement is tied to this record, not to the product.",
      },
    ],
  },
  {
    area: "storefront",
    label: "Storefront",
    glyph: [
      "M4.75 5.75h14.5v12.5H4.75z",
      "M4.75 9.25h14.5",
      "M7.25 7.5h.01",
    ],
    items: [
      {
        key: "banners",
        label: "Banners",
        href: "/admin/storefront/banners",
        description: "Hero and promotional banners across the storefront.",
      },
      {
        key: "featured-brands",
        label: "Featured Brands",
        href: "/admin/storefront/featured-brands",
        description: "The brands promoted on the homepage and category pages.",
      },
      {
        key: "popular-categories",
        label: "Popular Categories",
        href: "/admin/storefront/popular-categories",
        description: "The category shortcuts surfaced to shoppers first.",
      },
      {
        key: "curated-categories",
        label: "Curated Categories",
        href: "/admin/storefront/curated-categories",
        description:
          "Hand built collections that sit alongside the catalogue's own categories.",
      },
      {
        key: "best-deals",
        label: "Best Deals",
        href: "/admin/storefront/best-deals",
        description: "The always on savings rail and what qualifies for it.",
      },
      {
        key: "season-deals",
        label: "Season Deals",
        href: "/admin/storefront/season-deals",
        description: "Time boxed seasonal promotions and their run dates.",
      },
      {
        key: "homepage",
        label: "Homepage Builder",
        href: "/admin/storefront/homepage",
        description:
          "Reorderable homepage blocks: banners, featured releases, carousels and their editable titles.",
      },
      {
        key: "content",
        label: "Content & Policies",
        href: "/admin/storefront/content",
        description:
          "CMS pages, FAQs, promotional blocks and the published policy documents.",
      },
    ],
  },
  {
    area: "sales",
    label: "Sales",
    glyph: [
      "M5 7h14l-1.2 12H6.2z",
      "M9 7V5a3 3 0 0 1 6 0v2",
    ],
    items: [
      {
        key: "releases",
        label: "Releases",
        href: "/admin/releases",
        description:
          "Release date, allocation per variant, purchase caps, countdown, visibility, sold out state and waitlist.",
      },
      {
        key: "orders",
        label: "Orders",
        href: "/admin/orders",
        description:
          "Every order and its line items, payment state and customer.",
      },
      {
        key: "fulfilment",
        label: "Fulfilment",
        href: "/admin/fulfilment",
        description:
          "The dispatch pipeline: Processing, COD Call, Ready, Dispatched, Delivered. Dispatch binds the device serial or IMEI to the order.",
      },
    ],
  },
  {
    area: "service",
    label: "Service",
    glyph: [
      "M12 3.75l6.5 2.75v5.5c0 3.9-2.7 6.6-6.5 8.25-3.8-1.65-6.5-4.35-6.5-8.25V6.5z",
      "M9.5 12l1.75 1.75L15 10",
    ],
    items: [
      {
        key: "warranty",
        label: "Warranty & Claims",
        href: "/admin/service/warranty",
        description:
          "Warranty entitlement per device and the claims raised against it. Reads from the device registry, since cover follows the serial or IMEI.",
        routes: ["/admin/service/claims"],
      },
      {
        key: "returns",
        label: "Returns",
        href: "/admin/returns",
        description: "Return requests, their inspection outcome and refunds.",
      },
      {
        key: "support",
        label: "Support Tickets",
        href: "/admin/support",
        description: "Customer conversations and their resolution state.",
      },
      {
        key: "customers",
        label: "Customers",
        href: "/admin/customers",
        description:
          "Customer records with their orders, devices and service history.",
      },
    ],
  },
  {
    area: "marketing",
    label: "Marketing",
    glyph: [
      "M5 9.75h3.5L14.5 6v12l-6-3.75H5z",
      "M17.5 10.25a2.75 2.75 0 0 1 0 3.5",
    ],
    items: [
      {
        key: "campaigns",
        label: "Campaigns",
        href: "/admin/marketing/campaigns",
        description:
          "Release campaigns and email automation, including waitlist messaging.",
      },
      {
        key: "messages",
        label: "Marketing Messages",
        href: "/admin/marketing/messages",
        description:
          "Message templates and sends, kept apart from transactional messaging.",
      },
      {
        key: "coupons",
        label: "Discount Codes",
        href: "/admin/marketing/coupons",
        description: "Coupon codes, their conditions and redemption limits.",
        // Coupons were specified twice, once under Sales as `/admin/coupons`
        // and once under Marketing. Marketing is where the navigation puts
        // them; the Sales path is kept as an alias so links written against
        // either spelling land on the same module.
        routes: ["/admin/coupons"],
      },
    ],
  },
  {
    area: "integrations",
    label: "Integrations",
    glyph: [
      "M9.5 4.75v3.5",
      "M14.5 4.75v3.5",
      "M6.75 8.25h10.5v3.25a5.25 5.25 0 0 1-10.5 0z",
      "M12 16.75v2.5",
    ],
    items: [
      {
        key: "google-merchant",
        label: "Google Merchant",
        href: "/admin/integrations/google-merchant",
        description:
          "Google exporter built on the internal feed model, not a second copy of the product data.",
      },
      {
        key: "meta-catalog",
        label: "Meta Catalog",
        href: "/admin/integrations/meta-catalog",
        description:
          "Meta exporter built on the same internal feed model as Google Merchant.",
      },
      {
        key: "product-feeds",
        label: "Product Feeds",
        href: "/admin/integrations/product-feeds",
        description:
          "The one internal feed model both platform exporters are generated from.",
      },
    ],
  },
  {
    area: "governance",
    label: "Governance",
    glyph: [
      "M12 3.75l7.25 3.5v4.25c0 4.25-3 7.25-7.25 8.75-4.25-1.5-7.25-4.5-7.25-8.75V7.25z",
    ],
    items: [
      {
        key: "reports",
        label: "Reports",
        href: "/admin/reports",
        description: "Sales, service and inventory reporting.",
      },
      {
        key: "change-log",
        label: "Change Log",
        href: "/admin/change-log",
        description:
          "Who changed what, and to what: actor, action, entity, value before, value after and timestamp.",
      },
      {
        key: "delivery",
        label: "Delivery Zones",
        href: "/admin/settings/delivery",
        description: "Delivery zones, their rates and the areas they cover.",
      },
      {
        key: "vat",
        label: "VAT & Configuration",
        href: "/admin/settings/vat",
        description:
          "Tax rates and the general configuration the rest of the console reads.",
        routes: ["/admin/settings/general"],
      },
      {
        key: "staff",
        label: "Staff & Roles",
        href: "/admin/users",
        description:
          "Staff accounts and the roles that decide which areas each of them can reach.",
        routes: ["/admin/roles"],
      },
      {
        key: "trash",
        label: "Trash",
        href: "/admin/trash",
        description:
          "Deleted records held for restore. A system utility, not a business module.",
        children: [
          {
            key: "trash-products",
            label: "Products",
            href: "/admin/trash/products",
            description: "Deleted products awaiting restore or purge.",
          },
          {
            key: "trash-users",
            label: "Users",
            href: "/admin/trash/users",
            description: "Deleted staff and customer accounts.",
          },
        ],
      },
    ],
  },
];

/* ============================================================
   Route resolution
   ============================================================ */

export interface AdminRouteMatch {
  section: AdminNavSection;
  /** The most specific navigation row that owns this path. */
  item: AdminNavItem;
  /** Set when `item` is a nested row, so the sidebar can open its parent. */
  parent?: AdminNavItem;
  /** Path segments below the matched route, e.g. `["edit", "42"]`. */
  rest: string[];
}

interface FlatEntry {
  section: AdminNavSection;
  item: AdminNavItem;
  parent?: AdminNavItem;
}

/** Every navigation row, nested ones included, in declaration order. */
export function flattenAdminNav(): FlatEntry[] {
  return adminNav.flatMap((section) =>
    section.items.flatMap((item) => [
      { section, item },
      ...(item.children ?? []).map((child) => ({
        section,
        item: child,
        parent: item,
      })),
    ]),
  );
}

/** Strip a trailing slash so `/admin/orders/` and `/admin/orders` agree. */
function normalise(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
}

/**
 * The navigation row that owns `pathname`, or null when nothing does.
 *
 * A row owns its own route and everything beneath it, so the detail and
 * form routes each module will grow later (`/admin/products/add`,
 * `/admin/orders/1042`) resolve without being declared. When two rows
 * both match, the longer route wins: `/admin/products/inventory` belongs
 * to Inventory, not to Products.
 */
export function matchAdminRoute(pathname: string): AdminRouteMatch | null {
  const path = normalise(pathname);
  let best: AdminRouteMatch | null = null;
  let bestLength = -1;

  for (const { section, item, parent } of flattenAdminNav()) {
    for (const route of [item.href, ...(item.routes ?? [])]) {
      const owns = path === route || path.startsWith(`${route}/`);
      if (!owns || route.length <= bestLength) continue;

      bestLength = route.length;
      best = {
        section,
        item,
        parent,
        rest: path.slice(route.length).split("/").filter(Boolean),
      };
    }
  }

  return best;
}

/** True when this row should read as active for the current path. */
export function isAdminItemActive(
  match: AdminRouteMatch | null,
  item: AdminNavItem,
): boolean {
  if (!match) return false;
  return match.item === item || match.parent === item;
}

/* ============================================================
   Breadcrumbs
   ============================================================ */

export interface AdminCrumb {
  label: string;
  /** Absent on the current page and on section labels, which are not routes. */
  href?: string;
}

/** `upload-history` → `Upload History`; ids and codes are left as they are. */
function humanise(segment: string): string {
  const text = decodeURIComponent(segment);
  if (/\d/.test(text)) return text;
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Breadcrumb trail for any admin path, derived from the same config the
 * sidebar renders — so a module that moves in the navigation moves in
 * the breadcrumbs with it.
 */
export function getAdminBreadcrumbs(pathname: string): AdminCrumb[] {
  const match = matchAdminRoute(pathname);
  if (!match) return [];

  const crumbs: AdminCrumb[] = [{ label: "Dashboard", href: ADMIN_ROOT }];
  if (match.item.href === ADMIN_ROOT) return crumbs;

  crumbs.push({ label: match.section.label });
  if (match.parent) {
    crumbs.push({ label: match.parent.label, href: match.parent.href });
  }
  crumbs.push({
    label: match.item.label,
    href: match.rest.length > 0 ? match.item.href : undefined,
  });

  // Trailing segments are rendered as plain text: an id or a form step is
  // a position in the trail, not somewhere to navigate back to.
  for (const segment of match.rest) {
    crumbs.push({ label: humanise(segment) });
  }

  return crumbs;
}
