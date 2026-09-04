import { getUpcomingDrops } from "./drops";
import { getCategories } from "./categories";
import { getAllProducts, getProductsByCategory } from "./catalog";
import {
  productHrefForCategory,
  productHrefForDrop,
  SHOP_INDEX_HREF,
} from "./route-map";
import { supportContact, supportSections } from "./support";
import { policyLink } from "./policy-types";

export type MegaMenuId = "drops" | "shop" | "categories" | "about";

export interface MenuLink {
  label: string;
  href: string;
  note?: string;
}

export const shopBrowse: MenuLink[] = [
  { label: "All Devices", href: SHOP_INDEX_HREF },
  { label: "Smartphones", href: productHrefForCategory("phones") },
  { label: "Laptops", href: productHrefForCategory("laptops") },
  { label: "Tablets", href: productHrefForCategory("tablets") },
  { label: "Accessories", href: productHrefForCategory("accessories") },
];

export const shopPopular: string[] = [
  "iPhone",
  "MacBook",
  "iPad",
  "Samsung",
  "Google Pixel",
  "Dell",
];

export const aboutColumns: { title: string; items: MenuLink[] }[] = [
  {
    title: "The Company",
    items: [
      { label: "Our Story", href: "/about" },
      policyLink("terms-and-conditions"),
      policyLink("privacy-policy"),
    ],
  },
  {
    title: "Help & Policies",
    items: supportSections,
  },
];

export const aboutMenuLinks: MenuLink[] = aboutColumns.flatMap(
  (column) => column.items,
);

export { supportContact };

export interface CategoryNavItem {
  label: string;
  slug: string;
  href: string;
  brands: { label: string; href: string; count: number }[];
}

const CATEGORY_ORDER = [
  "phones",
  "laptops",
  "tablets",
  "accessories",
] as const;

export function getCategoryNav(): CategoryNavItem[] {
  const catalogueOrder = new Map(
    getCategories().map((c) => [c.slug, c.name]),
  );

  return CATEGORY_ORDER.map((slug): CategoryNavItem => {
    const label = catalogueOrder.get(slug) ?? slug;
    const products = getProductsByCategory(slug);
    const grouped = new Map<string, number>();
    for (const product of products) {
      grouped.set(product.brand, (grouped.get(product.brand) ?? 0) + 1);
    }
    const brands = Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([brand, count]) => ({
        label: brand,
        count,
        href: `${productHrefForCategory(slug)}?brand=${encodeURIComponent(brand)}`,
      }));

    return {
      label,
      slug,
      href: productHrefForCategory(slug),
      brands: brands.length > 1 ? brands : [],
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
  href: SHOP_INDEX_HREF,
  live: true,
};

export const editorialNavLink = { label: "About", href: "/about" } as const;

export { getAllProducts };

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

export function getDrawerSections(): DrawerSection[] {
  const drops = getUpcomingDrops()
    .slice(0, 4)
    .map((drop) => ({
      label: drop.name,
      href: productHrefForDrop(drop.slug),
      note: drop.edition,
    }));

  const categories: DrawerSection[] = getCategoryNav().map((item) => ({
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

  return [
    {
      label: "Upcoming Drops",
      href: SHOP_INDEX_HREF,
      badge: "live",
      items: [
        ...drops,
        { label: "View all upcoming drops", href: SHOP_INDEX_HREF },
      ],
    },
    ...categories,
    {
      label: editorialNavLink.label,
      href: editorialNavLink.href,
      items: aboutMenuLinks,
    },
  ];
}
