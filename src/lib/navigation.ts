import { ABOUT_PAGE_PATH, RELEASES_PAGE_PATH } from "@/lib/constants";
import type { StorefrontCategory } from "@/types/catalogue";
import type { PublishedNavigation } from "@/types/navigation";
import type { StorefrontReleaseSummary } from "@/types/storefront-release";
import { releaseHref } from "./releases";
import { productHrefForCategory, SHOP_INDEX_HREF } from "./route-map";
import { supportContact } from "./support";

const DRAWER_DROPS_LIMIT = 4;

export type MegaMenuId = "drops" | "shop" | "categories" | "about";

export interface MenuLink {
  label: string;
  href: string;
  note?: string;
}

export function shopBrowseLinks(categories: StorefrontCategory[]): MenuLink[] {
  return [
    { label: "All Devices", href: SHOP_INDEX_HREF },
    ...categories.map((category) => ({
      label: category.name,
      href: productHrefForCategory(category.slug),
    })),
  ];
}

export const shopPopular: string[] = [
  "iPhone",
  "MacBook",
  "iPad",
  "Samsung",
  "Google Pixel",
  "Dell",
];

export { supportContact };

export interface CategoryNavItem {
  label: string;
  slug: string;
  href: string;
  brands: { label: string; href: string; count: number }[];
}

export function categoryNav(categories: StorefrontCategory[]): CategoryNavItem[] {
  return categories.map((category): CategoryNavItem => {
    const href = productHrefForCategory(category.slug);
    return {
      label: category.name,
      slug: category.slug,
      href,
      brands:
        category.brands.length > 1
          ? category.brands.map((brand) => ({
              label: brand.value,
              count: brand.count,
              href: `${href}?brand=${encodeURIComponent(brand.value)}`,
            }))
          : [],
    };
  });
}

export function categoryNavIsActive(pathname: string, slug: string): boolean {
  return (
    pathname === productHrefForCategory(slug) ||
    pathname.startsWith(`${productHrefForCategory(slug)}/`)
  );
}

export const upcomingDropsLink = {
  label: "Upcoming Drops",
  href: RELEASES_PAGE_PATH,
  live: true,
};

export const editorialNavLink = { label: "About", href: ABOUT_PAGE_PATH } as const;

export const categoryGlyphs: Record<string, string[]> = {
  phones: [
    "M8.5 3.25h7a1.75 1.75 0 0 1 1.75 1.75v14a1.75 1.75 0 0 1-1.75 1.75h-7A1.75 1.75 0 0 1 6.75 19V5A1.75 1.75 0 0 1 8.5 3.25Z",
    "M10.75 6.25h2.5",
  ],
  laptops: [
    "M6.25 6.5h11.5a.5.5 0 0 1 .5.5v8.25H5.75V7a.5.5 0 0 1 .5-.5Z",
    "M3.25 18.25h17.5",
  ],
  tablets: [
    "M6.5 3.75h11a1.5 1.5 0 0 1 1.5 1.5v13.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.75V5.25a1.5 1.5 0 0 1 1.5-1.5Z",
    "M10.75 17.25h2.5",
  ],
  accessories: [
    "M9 3.75v4.5",
    "M15 3.75v4.5",
    "M7.25 8.25h9.5v2.75a4.75 4.75 0 0 1-9.5 0V8.25Z",
    "M12 15.75v4.5",
  ],
};

export interface DrawerSection {
  label: string;
  href: string;
  badge?: "live";
  items: MenuLink[];
}

/**
 * The drawer's sections in the order of the header rail. `categoryList` and
 * `drops` arrive already filtered and ordered by staff; a menu staff hid is
 * absent from `header.rail` and so from the drawer.
 */
export function getDrawerSections(
  categoryList: StorefrontCategory[],
  header: PublishedNavigation["header"],
  drops: StorefrontReleaseSummary[],
): DrawerSection[] {
  const categories: DrawerSection[] = categoryNav(categoryList).map((item) => ({
    label: item.label,
    href: item.href,
    items:
      item.brands.length > 0
        ? [
            ...item.brands.map((brand) => ({
              label: brand.label,
              href: brand.href,
              note: String(brand.count),
            })),
            { label: `All ${item.label.toLowerCase()}`, href: item.href },
          ]
        : [],
  }));

  const dropsSection: DrawerSection = {
    label: upcomingDropsLink.label,
    href: upcomingDropsLink.href,
    badge: "live",
    items: [
      ...drops.slice(0, DRAWER_DROPS_LIMIT).map((drop) => ({
        label: drop.title,
        href: releaseHref(drop.slug),
        note: drop.edition,
      })),
      { label: "View all upcoming drops", href: RELEASES_PAGE_PATH },
    ],
  };

  const aboutSection: DrawerSection = {
    label: editorialNavLink.label,
    href: editorialNavLink.href,
    items: header.aboutColumns.flatMap((column) => column.links),
  };

  return header.rail.flatMap((item): DrawerSection[] => {
    if (!("href" in item)) {
      if (item.id === "categories") return categories;
      return item.id === "drops" ? [dropsSection] : [aboutSection];
    }
    return [{ label: item.label, href: item.href, items: [] }];
  });
}
