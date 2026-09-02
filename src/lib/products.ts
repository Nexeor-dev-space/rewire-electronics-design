/**
 * Catalogue adapter — the everyday storefront, as opposed to the drop
 * calendar in `drops.ts`.
 *
 * The two are deliberately separate. A drop is an event: it has an
 * edition, an opening time and a fixed allocation. A catalogue product is
 * simply stock that is either there or not. Modelling both as one type
 * meant every card had to carry countdown fields it did not use, and
 * every drop had to pretend it had an availability state.
 *
 * ⚠ Two catalogues live side by side while the storefront and the
 * marketing site converge. The rich source of truth for actual stock is
 * `@/lib/catalog` (backed by real product seeds — iPhones, MacBooks,
 * AirPods, and so on) and it also owns the `/product/[slug]` detail
 * page. This file remains as the **compact view-model** the marketing
 * card and cross-sell rails expect. The homepage getters below (
 * `getFeaturedProducts`, `getSetupBundle`) project catalog entries into
 * this smaller shape so a click on a homepage card resolves against
 * `getProductBySlug` in the catalogue rather than 404-ing on a mock
 * slug.
 */

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

const AED = { currency: "AED", locale: "en-AE" } as const;

const products: Product[] = [
  {
    id: "p1",
    slug: "halo-phone-pro",
    name: "Halo Phone Pro",
    variant: "Graphite · 512GB",
    category: "phones",
    price: 2_49900,
    originalPrice: 3_89900,
    ...AED,
    availability: "in-stock",
    image: { url: "/images/hero/phone.png", alt: "Halo Phone Pro standing upright, matte black" },
  },
  {
    id: "p2",
    slug: "atlas-book-15",
    name: "Atlas Book 15",
    variant: "Titanium · 1TB",
    category: "laptops",
    price: 4_19900,
    originalPrice: 6_49900,
    ...AED,
    availability: "in-stock",
    image: { url: "/images/hero/laptop.png", alt: "Atlas Book 15 half open, seen from the side" },
  },
  {
    id: "p3",
    slug: "echo-studio",
    name: "Echo Studio",
    variant: "Midnight · Over-ear",
    category: "audio",
    price: 39900,
    originalPrice: 66900,
    ...AED,
    availability: "low-stock",
    unitsLeft: 4,
    image: { url: "/images/hero/headphones.png", alt: "Echo Studio over-ear headphones, suspended" },
  },
  {
    id: "p4",
    slug: "orbit-watch-classic",
    name: "Orbit Watch Classic",
    variant: "Slate · 42mm",
    category: "wearables",
    price: 54900,
    originalPrice: 94900,
    ...AED,
    availability: "in-stock",
    image: { url: "/images/hero/watch.png", alt: "Orbit Watch Classic with a leather strap" },
  },
  {
    id: "p5",
    slug: "signal-phone-pro",
    name: "Signal Phone Pro",
    variant: "Obsidian · 1TB",
    category: "phones",
    price: 3_09900,
    originalPrice: 4_79900,
    ...AED,
    availability: "in-stock",
    image: { url: "/images/hero-product.png", alt: "Signal Phone Pro, matte black with an embossed logotype" },
  },
  {
    id: "p6",
    slug: "vector-book-13",
    name: "Vector Book 13",
    variant: "Silver · 512GB",
    category: "laptops",
    price: 2_89900,
    originalPrice: 4_89900,
    ...AED,
    availability: "low-stock",
    unitsLeft: 3,
    image: { url: "/images/hero/laptop.png", alt: "Vector Book 13 half open, seen from the side" },
  },
  {
    id: "p7",
    slug: "aria-studio-buds",
    name: "Aria Studio Buds",
    variant: "Ivory · In-ear",
    category: "audio",
    price: 24900,
    originalPrice: 44900,
    ...AED,
    availability: "in-stock",
    image: { url: "/images/hero/headphones.png", alt: "Aria Studio earphones on a lit plinth" },
  },
  {
    id: "p8",
    slug: "pulse-watch-s",
    name: "Pulse Watch S",
    variant: "Obsidian · 46mm",
    category: "wearables",
    price: 69900,
    originalPrice: 1_09900,
    ...AED,
    availability: "sold-out",
    image: { url: "/images/hero/watch.png", alt: "Pulse Watch S with a woven strap" },
  },
  {
    id: "p9",
    slug: "field-case-pro",
    name: "Field Case",
    variant: "Sand · Leather",
    category: "accessories",
    price: 14900,
    originalPrice: 21900,
    ...AED,
    availability: "in-stock",
    image: { url: "/images/hero/phone.png", alt: "Leather phone case, sand" },
  },
  {
    id: "p10",
    slug: "anchor-charger-65w",
    name: "Anchor Charger",
    variant: "65W · Dual USB-C",
    category: "accessories",
    price: 9900,
    originalPrice: 15900,
    ...AED,
    availability: "in-stock",
    image: { url: "/images/hero/phone.png", alt: "Compact dual-port charger" },
  },
  {
    id: "p11",
    slug: "transit-sleeve-15",
    name: "Transit Sleeve",
    variant: "Charcoal · 15in",
    category: "accessories",
    price: 17900,
    originalPrice: 24900,
    ...AED,
    availability: "in-stock",
    image: { url: "/images/hero/laptop.png", alt: "Padded laptop sleeve in charcoal" },
  },
];

export function getProducts(): Product[] {
  return products;
}

export function findProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
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
 * The storefront rail — **one product per primary family**, so the row
 * reads as the range rather than as four phones. Smartphones, Laptops,
 * Tablets, Accessories: the same four the navbar rail and the hero's
 * category strip carry, in the same order, because a shelf that
 * showcases a family the navigation does not offer sends a shopper
 * looking for a way in that is not there.
 *
 * The AirPods Max and Apple Watch Ultra cards were dropped with Audio
 * and Wearables. Both products are still in the catalogue, still on
 * `/collection`, and still reachable from search — they are simply no
 * longer the homepage's argument for what Rewire sells.
 *
 * Sold-out stock is excluded: a "best sellers" shelf whose first card
 * cannot be bought teaches the wrong thing about the store.
 *
 * Sourced from the catalogue so the slug on each card resolves to a
 * live `/product/[slug]` page. Falls back to the local mock if a wanted
 * slug is missing from the catalogue (keeps the shelf full during
 * development).
 */
export function getFeaturedProducts(): Product[] {
  const wanted = [
    "iphone-15-pro-max",
    "macbook-air-13-m2",
    "ipad-pro-11-m2",
    "magic-keyboard-ipad-pro",
  ];
  return wanted
    .map((slug) => getCatalogProductBySlug(slug))
    .filter((p): p is CatalogProduct => Boolean(p))
    .filter((p) => p.availability !== "sold-out")
    .map(projectFromCatalog);
}

/**
 * Deals, ordered by how much is actually saved rather than by percentage.
 * A 42% saving on a charger is a smaller reason to act than 35% on a
 * laptop, and the section's job is to make the value obvious.
 */
export function getDeals(limit = 3): Product[] {
  return [...products]
    .filter((p) => p.availability !== "sold-out")
    .sort((a, b) => savingAmount(b) - savingAmount(a))
    .slice(0, limit);
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

/* ---------- Availability → the one honest CTA ---------- */

export interface CommerceCta {
  label: string;
  /** False when the action registers interest rather than sells. */
  purchasable: boolean;
}

/**
 * The label is a promise about what happens next, so it is derived from
 * stock rather than written per card. "Grab It Now" on something that
 * cannot be bought is the single most damaging copy error on a
 * storefront — it is why this is a function and not a prop.
 */
export function commerceCta(availability: Availability): CommerceCta {
  switch (availability) {
    case "in-stock":
    case "low-stock":
      return { label: "View Product", purchasable: true };
    case "pre-order":
      return { label: "Join Waitlist", purchasable: false };
    case "sold-out":
      return { label: "Notify Me", purchasable: false };
  }
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
