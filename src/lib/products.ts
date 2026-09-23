import { getProductBySlug as getCatalogProductBySlug } from "./catalog";
import type { Product as CatalogProduct } from "@/types";

export type Availability = "in-stock" | "low-stock" | "sold-out" | "pre-order";

export interface Product {
  id: string;
  /** Route segment under /product. */
  slug: string;
  name: string;
  /** Colour and capacity, e.g. "Graphite · 512GB". */
  variant: string;
  /** Catalogue category slug — must match `categories.ts`. */
  category: string;
  /** Selling price in minor units. */
  price: number;
  /** What it costs new, in minor units. The saving is always derived. */
  originalPrice: number;
  currency: string;
  locale: string;
  availability: Availability;
  /** Only meaningful while `availability` is "low-stock". */
  unitsLeft?: number;
  image: { url: string; alt: string };
}

/** Every product card in the app resolves its destination through this. */
export function productHref(product: Product): string {
  return `/product/${product.slug}`;
}

/* ---------- Catalog → local Product projection ----------
 * StorefrontCard and Setup speak the small `Product` shape above, but
 * the destination page reads `getProductBySlug` from the catalogue.
 * Projecting keeps a single source of truth for slugs (and therefore
 * for the URLs the cards resolve to) without altering any card visuals. */

export function projectFromCatalog(item: CatalogProduct): Product {
  const image = item.images[0];
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    variant: item.variant,
    category: item.categorySlug ?? item.category.toLowerCase(),
    price: item.price,
    originalPrice: item.originalPrice ?? item.price,
    currency: item.currency,
    locale: item.locale ?? "en-AE",
    // The catalog carries a fifth state ("coming-soon"); the storefront's
    // vocabulary calls that "pre-order", so map at the boundary.
    availability:
      item.availability === "coming-soon"
        ? "pre-order"
        : (item.availability ?? "in-stock"),
    unitsLeft: item.availability === "low-stock" ? item.stock : undefined,
    image: {
      url: image?.url ?? "",
      alt: image?.alt ?? item.name,
    },
  };
}

/**
 * Cross-sell for the flagship phone: the things people put in the same
 * basket. Hand-picked rather than derived — "customers also bought"
 * needs order history, and inventing that relationship is worse than
 * curating it.
 */
export function getSetupBundle(): { anchor: Product; additions: Product[] } | undefined {
  const anchorSource = getCatalogProductBySlug("iphone-15-pro-max");
  if (!anchorSource) return undefined;
  const additions = ["airpods-max", "apple-watch-ultra", "96w-usb-c-adapter"]
    .map((slug) => getCatalogProductBySlug(slug))
    .filter((p): p is CatalogProduct => Boolean(p))
    .map(projectFromCatalog);
  return { anchor: projectFromCatalog(anchorSource), additions };
}

/* ---------- Derived money ---------- */

/** Absolute saving in minor units. */
export function savingAmount(product: Product): number {
  return Math.max(0, product.originalPrice - product.price);
}

/** Whole-percent saving, rounded. 0 when there is nothing to claim. */
export function savingPercent(product: Product): number {
  if (product.originalPrice <= 0 || product.price >= product.originalPrice) return 0;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

/** Short status word for the card's availability chip. */
export function availabilityLabel(product: Product): string {
  switch (product.availability) {
    case "in-stock":
      return "In stock";
    case "low-stock":
      return product.unitsLeft ? `Only ${product.unitsLeft} left` : "Low stock";
    case "pre-order":
      return "Pre-order";
    case "sold-out":
      return "Sold out";
  }
}
