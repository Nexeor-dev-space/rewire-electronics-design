import type { Media } from "@/types";

/**
 * Shop catalogue adapter — mock for now, Payload CMS later.
 *
 * ⚠ PLACEHOLDER CATALOGUE. Prices, stock and listing dates exercise the
 * layout; none are real. Photography is shared per category because the
 * prototype has five renders and thirty-two listings — swap `categoryImagery`
 * for per-product media before launch. No other module reads image paths.
 *
 * ── The three axes ──────────────────────────────────────────────────
 *
 * The one rule this file exists to enforce: **category, condition and
 * grade are three different questions and never collapse into each
 * other.**
 *
 *   category   what the product *is*    — a laptop, a pair of headphones
 *   condition  how it is being *sold*   — refurbished, pre-owned, open box, new
 *   grade      what state it is *in*    — premium, excellent, very good, good
 *
 * They are separate types, separate filter groups, and separate places in
 * the card: category drives the nav, condition is the badge on the image,
 * grade is a line of text under the name. A shopper who has learned one
 * of them has learned nothing about the other two, which is exactly why
 * merging them into a single "condition" pill — the usual shortcut —
 * makes a catalogue this size unreadable.
 *
 * Grade is deliberately **optional**: a sealed unit has no wear to grade.
 * `gradeApplies()` is the single place that decision lives.
 */

/* ============================================================
   Category — what the product is
   ============================================================ */

export type CategorySlug =
  | "smartphones"
  | "laptops"
  | "tablets"
  | "smartwatches"
  | "audio"
  | "accessories";

export interface ShopCategory {
  slug: CategorySlug;
  label: string;
}

export const shopCategories: ShopCategory[] = [
  { slug: "smartphones", label: "Smartphones" },
  { slug: "laptops", label: "Laptops" },
  { slug: "tablets", label: "Tablets" },
  { slug: "smartwatches", label: "Smartwatches" },
  { slug: "audio", label: "Audio" },
  { slug: "accessories", label: "Accessories" },
];

export const CATEGORY_LABELS = Object.fromEntries(
  shopCategories.map((category) => [category.slug, category.label]),
) as Record<CategorySlug, string>;

/**
 * The mega menu and footer already link to `/collection/phones`. Rather
 * than rewrite the navigation — which is not this page's job — the shop
 * accepts the older segments and resolves them here.
 */
const categoryAliases: Record<string, CategorySlug> = {
  phones: "smartphones",
  phone: "smartphones",
  laptop: "laptops",
  tablet: "tablets",
  wearables: "smartwatches",
  watches: "smartwatches",
  headphones: "audio",
};

export function resolveCategory(segment?: string): CategorySlug | null {
  if (!segment) return null;
  const slug = segment.toLowerCase();
  if (shopCategories.some((category) => category.slug === slug)) {
    return slug as CategorySlug;
  }
  return categoryAliases[slug] ?? null;
}

/* ============================================================
   Popular search terms → the shop, pre-filtered
   ============================================================ */

/**
 * The navigation's "Popular" column lists product families and makers —
 * iPhone, MacBook, Samsung — not routes. They used to point at
 * `/search?q=…`, which has never existed and returned a 404 on every
 * click.
 *
 * There is no text search on the catalogue, and inventing one to serve
 * six menu links would be the wrong trade. What these terms actually
 * *mean* is a category, a brand, or both — which the shop already
 * filters on. So each term resolves to the filtered listing that answers
 * it, and the menu stops being a dead end.
 */
const popularTerms: Record<string, { category?: CategorySlug; brand?: string }> = {
  iphone: { category: "smartphones", brand: "Apple" },
  ipad: { category: "tablets", brand: "Apple" },
  macbook: { category: "laptops", brand: "Apple" },
  airpods: { category: "audio", brand: "Apple" },
  "apple watch": { category: "smartwatches", brand: "Apple" },
  apple: { brand: "Apple" },
  samsung: { brand: "Samsung" },
  "google pixel": { brand: "Google" },
  google: { brand: "Google" },
  sony: { brand: "Sony" },
  bose: { brand: "Bose" },
  dell: { brand: "Dell" },
  microsoft: { brand: "Microsoft" },
  lenovo: { brand: "Lenovo" },
};

/**
 * Where a popular term should land. Unrecognised terms fall back to the
 * unfiltered shop rather than a 404 — a slightly broad answer beats no
 * answer, and it means adding a term to the menu can never break a link.
 */
export function shopHrefForTerm(term: string): string {
  const match = popularTerms[term.trim().toLowerCase()];
  if (!match) return "/collection";

  const path = match.category ? `/collection/${match.category}` : "/collection";
  return match.brand
    ? `${path}?brand=${encodeURIComponent(match.brand)}`
    : path;
}

/** Reads a `?brand=` value into the filter axis, ignoring anything unknown. */
export function brandsFromParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const requested = (Array.isArray(value) ? value : [value]).flatMap((entry) =>
    entry.split(","),
  );
  const known = new Set(getBrands());
  return requested
    .map((entry) => entry.trim())
    .filter((entry) => known.has(entry));
}

/* ============================================================
   Condition — how it is being sold
   ============================================================ */

/**
 * **The condition vocabulary, defined once for the whole storefront.**
 *
 * Every surface that names a condition reads this list: the filter
 * panel, the card badge, the product page's `ConditionExplainer`, the
 * About page's conditions section, and the homepage's "What you have"
 * legend. The three used conditions are distinct claims and are never
 * interchangeable:
 *
 *   Refurbished  a product that has been restored — repaired
 *   Pre-Owned    previously owned, sold in the same condition — not repaired
 *   Open Box     unused, with packaging that has been opened
 *
 * The line that separates Refurbished from Pre-Owned is repair, and the
 * line that separates both from Open Box is use. "Just Opened" was an
 * older name for Open Box and is gone: two names for one state is how a
 * condition stops meaning anything.
 */
export type Condition = "refurbished" | "pre-owned" | "open-box" | "new";

export interface ConditionMeta {
  value: Condition;
  /** Full name, used in the filter list where there is room. */
  label: string;
  /** Compact form for the card badge. */
  short: string;
  /** One line of plain explanation. Filters and legends only. */
  note: string;
  /**
   * The condition in four or five words — the distinction itself, with
   * nothing else in it. Used where the layout wants the definition
   * beside the term rather than under it.
   */
  summary: string;
}

export const conditions: ConditionMeta[] = [
  {
    value: "refurbished",
    label: "Refurbished",
    short: "Refurbished",
    summary: "Repaired and restored",
    note: "A product that has been restored — repaired, then certified through the 68-point inspection.",
  },
  {
    value: "pre-owned",
    label: "Pre-Owned",
    short: "Pre-Owned",
    summary: "Used, not repaired",
    note: "A previously owned product, sold in the same condition. Tested and cleared, but not repaired.",
  },
  {
    value: "open-box",
    label: "Open Box",
    short: "Open Box",
    summary: "Unused, packaging opened",
    note: "An unused product with opened packaging. The seal was broken, and nothing else was.",
  },
  {
    value: "new",
    label: "New",
    short: "New",
    summary: "Sealed and unused",
    note: "Sealed, unused, and covered by the full manufacturer warranty.",
  },
];

export const CONDITION_META = Object.fromEntries(
  conditions.map((condition) => [condition.value, condition]),
) as Record<Condition, ConditionMeta>;

/**
 * Reads a `?condition=` value into the filter axis, ignoring anything
 * unknown — the same contract as `brandsFromParam`. This is what makes
 * the homepage's "What you have" legend a working entry point rather
 * than three tiles that all land on the unfiltered shelf.
 */
export function conditionsFromParam(
  value: string | string[] | undefined,
): Condition[] {
  if (!value) return [];
  const requested = (Array.isArray(value) ? value : [value]).flatMap((entry) =>
    entry.split(","),
  );
  const known = new Set<string>(conditions.map((condition) => condition.value));
  return requested
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is Condition => known.has(entry));
}

/* ============================================================
   Grade — what state it is in
   ============================================================ */

export type Grade = "premium" | "excellent" | "very-good" | "good";

export interface GradeMeta {
  value: Grade;
  label: string;
  note: string;
}

export const grades: GradeMeta[] = [
  { value: "premium", label: "Premium", note: "No visible marks under studio light." },
  { value: "excellent", label: "Excellent", note: "Faint marks, visible only at an angle." },
  { value: "very-good", label: "Very Good", note: "Light marks across the chassis." },
  { value: "good", label: "Good", note: "Visible wear. Structurally flawless." },
];

export const GRADE_META = Object.fromEntries(
  grades.map((grade) => [grade.value, grade]),
) as Record<Grade, GradeMeta>;

/**
 * Grading describes wear, so it only means anything on a device that has
 * been used. Sealed and open-box units are ungraded by definition — and
 * showing them as "Premium" would quietly turn grade into a marketing
 * adjective, which is the thing this file is built to prevent.
 */
export function gradeApplies(condition: Condition): boolean {
  return condition === "refurbished" || condition === "pre-owned";
}

/* ============================================================
   Price bands
   ============================================================ */

export interface PriceBand {
  id: string;
  label: string;
  min: number;
  /** Exclusive. `Infinity` for the open-ended top band. */
  max: number;
}

/**
 * Minor units, AED. Bands rather than a slider: the catalogue spans
 * AED 129 to AED 6,499, a range where a single handle is impossible to
 * aim and a two-handle range control is unusable on a phone.
 */
export const priceBands: PriceBand[] = [
  { id: "under-500", label: "Under AED 500", min: 0, max: 500_00 },
  { id: "500-1500", label: "AED 500 – 1,500", min: 500_00, max: 1_500_00 },
  { id: "1500-3000", label: "AED 1,500 – 3,000", min: 1_500_00, max: 3_000_00 },
  { id: "3000-plus", label: "AED 3,000 +", min: 3_000_00, max: Infinity },
];

/* ============================================================
   Product
   ============================================================ */

export interface ShopProduct {
  id: string;
  slug: string;
  /** Manufacturer. Its own axis again — brand is not category. */
  brand: string;
  /** Model name, without the brand. The card prints both. */
  name: string;
  category: CategorySlug;
  condition: Condition;
  /** Absent wherever `gradeApplies(condition)` is false. */
  grade?: Grade;
  /** One line: the single specification worth scanning in a grid. */
  keySpec: string;
  /** Capacity, where the product has any. */
  storage?: string;
  /** Finish or size — the other half of "storage / variant". */
  variant?: string;
  /** Minor units. */
  price: number;
  /** What it costs new. Omitted on sealed stock, which is not discounted. */
  originalPrice?: number;
  currency: string;
  locale: string;
  image: ShopImage;
  stock: number;
  /** ISO date the listing went up — drives "Newest". */
  listedAt: string;
  /** Curated order for "Recommended". Lower sorts first. */
  rank: number;
}

/* ---------- Imagery ---------- */

/**
 * A catalogue image plus how its frame should hold it. The library mixes
 * two kinds of source — transparent studio cutouts, which must float
 * inside a padded stage, and full-bleed photography, which must fill it.
 * Without the hint the two are indistinguishable to a component, and one
 * of them always renders wrong.
 *
 * Kept local rather than pushed onto `Media`: this is a decision about
 * *this grid's* stage, not a property of the asset in the CMS.
 */
export interface ShopImage extends Media {
  fit: "contain" | "cover";
}

type ImageSeed = Omit<ShopImage, "id" | "alt"> & { alt?: string };

const categoryImagery: Record<CategorySlug, ImageSeed> = {
  smartphones: { url: "/images/hero/phone.png", width: 849, height: 1900, fit: "contain" },
  laptops: { url: "/images/hero/laptop.png", width: 1600, height: 1200, fit: "contain" },
  audio: { url: "/images/hero/headphones.png", width: 1600, height: 1600, fit: "contain" },
  smartwatches: { url: "/images/hero/watch.png", width: 1200, height: 1600, fit: "contain" },
  tablets: { url: "/images/categories/tablets.jpg", width: 1000, height: 1250, fit: "cover" },
  accessories: { url: "/images/craft/craft-02.jpg", width: 1000, height: 1333, fit: "cover" },
};

/* ---------- Seeds ---------- */

interface Seed
  extends Omit<ShopProduct, "id" | "slug" | "currency" | "locale" | "image"> {
  slug?: string;
  /** Overrides the category render — accessories are shot individually. */
  image?: ImageSeed;
}

/** AED throughout, matching the drops — the company trades out of Dubai. */
const AED = { currency: "AED", locale: "en-AE" } as const;

const seeds: Seed[] = [
  /* ---------- Smartphones ---------- */
  { rank: 1, brand: "Apple", name: "iPhone 14 Pro", category: "smartphones", condition: "refurbished", grade: "premium", keySpec: "A16 Bionic · 6.1-inch ProMotion", storage: "256GB", variant: "Space Black", price: 2_499_00, originalPrice: 4_299_00, stock: 12, listedAt: "2026-08-11" },
  { rank: 7, brand: "Apple", name: "iPhone 13", category: "smartphones", condition: "refurbished", grade: "excellent", keySpec: "A15 Bionic · Dual 12MP camera", storage: "128GB", variant: "Midnight", price: 1_449_00, originalPrice: 2_699_00, stock: 18, listedAt: "2026-08-04" },
  { rank: 3, brand: "Samsung", name: "Galaxy S23 Ultra", category: "smartphones", condition: "open-box", keySpec: "Snapdragon 8 Gen 2 · 200MP", storage: "512GB", variant: "Phantom Black", price: 2_899_00, originalPrice: 4_999_00, stock: 6, listedAt: "2026-08-08" },
  { rank: 12, brand: "Google", name: "Pixel 7 Pro", category: "smartphones", condition: "pre-owned", grade: "very-good", keySpec: "Tensor G2 · 5× telephoto", storage: "128GB", variant: "Obsidian", price: 1_299_00, originalPrice: 2_899_00, stock: 4, listedAt: "2026-07-29" },
  { rank: 2, brand: "Apple", name: "iPhone 15 Pro Max", category: "smartphones", condition: "new", keySpec: "A17 Pro · Titanium chassis", storage: "512GB", variant: "Natural Titanium", price: 4_699_00, stock: 5, listedAt: "2026-08-15" },
  { rank: 18, brand: "Samsung", name: "Galaxy S22", category: "smartphones", condition: "pre-owned", grade: "good", keySpec: "Snapdragon 8 Gen 1 · 6.1-inch", storage: "128GB", variant: "Green", price: 999_00, originalPrice: 2_299_00, stock: 3, listedAt: "2026-07-02" },
  { rank: 9, brand: "Google", name: "Pixel 8", category: "smartphones", condition: "open-box", keySpec: "Tensor G3 · seven years of updates", storage: "256GB", variant: "Hazel", price: 1_749_00, originalPrice: 2_499_00, stock: 8, listedAt: "2026-08-13" },
  { rank: 22, brand: "Apple", name: "iPhone 12", category: "smartphones", condition: "refurbished", grade: "very-good", keySpec: "A14 Bionic · Ceramic Shield", storage: "64GB", variant: "Blue", price: 949_00, originalPrice: 2_199_00, stock: 15, listedAt: "2026-06-24" },

  /* ---------- Laptops ---------- */
  { rank: 4, brand: "Apple", name: "MacBook Air 13 M2", category: "laptops", condition: "refurbished", grade: "premium", keySpec: "M2 · 8-core GPU · 18-hour battery", storage: "256GB", variant: "Midnight", price: 2_799_00, originalPrice: 4_599_00, stock: 9, listedAt: "2026-08-09" },
  { rank: 6, brand: "Apple", name: "MacBook Pro 14 M1 Pro", category: "laptops", condition: "refurbished", grade: "excellent", keySpec: "M1 Pro · 120Hz mini-LED XDR", storage: "512GB", variant: "Space Grey", price: 3_899_00, originalPrice: 7_499_00, stock: 5, listedAt: "2026-08-02" },
  { rank: 14, brand: "Dell", name: "XPS 13 Plus", category: "laptops", condition: "pre-owned", grade: "very-good", keySpec: "Core i7-1360P · OLED 3.5K touch", storage: "512GB", variant: "Platinum", price: 2_199_00, originalPrice: 4_199_00, stock: 6, listedAt: "2026-07-25" },
  { rank: 16, brand: "Microsoft", name: "Surface Laptop 5", category: "laptops", condition: "refurbished", grade: "excellent", keySpec: "Core i5-1235U · 3:2 PixelSense", storage: "256GB", variant: "Sage", price: 1_899_00, originalPrice: 3_699_00, stock: 4, listedAt: "2026-07-18" },
  { rank: 5, brand: "Apple", name: "MacBook Pro 16 M2 Max", category: "laptops", condition: "new", keySpec: "M2 Max · 38-core GPU · 32GB", storage: "1TB", variant: "Space Grey", price: 6_499_00, stock: 2, listedAt: "2026-08-17" },
  { rank: 25, brand: "Lenovo", name: "ThinkPad X1 Carbon", category: "laptops", condition: "pre-owned", grade: "good", keySpec: "Core i7-1265U · 14-inch WUXGA", storage: "512GB", variant: "Black", price: 1_599_00, originalPrice: 3_899_00, stock: 7, listedAt: "2026-07-06" },

  /* ---------- Tablets ---------- */
  { rank: 8, brand: "Apple", name: "iPad Pro 11 M2", category: "tablets", condition: "refurbished", grade: "premium", keySpec: "M2 · 120Hz ProMotion · Pencil hover", storage: "256GB", variant: "Space Grey", price: 2_299_00, originalPrice: 3_999_00, stock: 8, listedAt: "2026-08-07" },
  { rank: 13, brand: "Apple", name: "iPad Air", category: "tablets", condition: "refurbished", grade: "excellent", keySpec: "M1 · 10.9-inch Liquid Retina", storage: "64GB", variant: "Blue", price: 1_149_00, originalPrice: 2_299_00, stock: 14, listedAt: "2026-07-31" },
  { rank: 20, brand: "Samsung", name: "Galaxy Tab S8", category: "tablets", condition: "pre-owned", grade: "very-good", keySpec: "Snapdragon 8 Gen 1 · S Pen included", storage: "128GB", variant: "Graphite", price: 1_099_00, originalPrice: 2_599_00, stock: 5, listedAt: "2026-07-09" },
  { rank: 11, brand: "Apple", name: "iPad mini", category: "tablets", condition: "open-box", keySpec: "A15 Bionic · 8.3-inch Liquid Retina", storage: "256GB", variant: "Starlight", price: 1_549_00, originalPrice: 2_199_00, stock: 6, listedAt: "2026-08-12" },

  /* ---------- Smartwatches ---------- */
  { rank: 10, brand: "Apple", name: "Watch Series 8", category: "smartwatches", condition: "refurbished", grade: "excellent", keySpec: "ECG and temperature sensing", variant: "Midnight · 45mm", price: 749_00, originalPrice: 1_599_00, stock: 16, listedAt: "2026-08-06" },
  { rank: 15, brand: "Apple", name: "Watch Ultra", category: "smartwatches", condition: "refurbished", grade: "premium", keySpec: "Titanium · 100m · 36-hour battery", variant: "Titanium · 49mm", price: 1_899_00, originalPrice: 3_299_00, stock: 3, listedAt: "2026-08-14" },
  { rank: 21, brand: "Samsung", name: "Galaxy Watch 5 Pro", category: "smartwatches", condition: "pre-owned", grade: "very-good", keySpec: "Sapphire crystal · 80-hour battery", variant: "Black Titanium · 45mm", price: 649_00, originalPrice: 1_499_00, stock: 5, listedAt: "2026-07-20" },
  { rank: 27, brand: "Garmin", name: "Fenix 7", category: "smartwatches", condition: "pre-owned", grade: "good", keySpec: "Solar charging · multi-band GPS", variant: "Slate Grey · 47mm", price: 1_249_00, originalPrice: 2_899_00, stock: 4, listedAt: "2026-06-30" },

  /* ---------- Audio ---------- */
  { rank: 17, brand: "Apple", name: "AirPods Pro (2nd gen)", category: "audio", condition: "open-box", keySpec: "H2 · Adaptive Transparency", variant: "White", price: 549_00, originalPrice: 999_00, stock: 22, listedAt: "2026-08-12" },
  { rank: 19, brand: "Sony", name: "WH-1000XM4", category: "audio", condition: "refurbished", grade: "excellent", keySpec: "30-hour battery · LDAC", variant: "Midnight Blue", price: 649_00, originalPrice: 1_399_00, stock: 11, listedAt: "2026-08-05" },
  { rank: 24, brand: "Bose", name: "QuietComfort 45", category: "audio", condition: "refurbished", grade: "very-good", keySpec: "24-hour battery · Quiet and Aware", variant: "Triple Black", price: 499_00, originalPrice: 1_199_00, stock: 8, listedAt: "2026-07-22" },
  { rank: 23, brand: "Apple", name: "AirPods Max", category: "audio", condition: "refurbished", grade: "premium", keySpec: "Spatial audio with head tracking", variant: "Space Grey", price: 1_249_00, originalPrice: 2_299_00, stock: 3, listedAt: "2026-08-13" },
  { rank: 28, brand: "Sennheiser", name: "Momentum 4", category: "audio", condition: "pre-owned", grade: "good", keySpec: "60-hour battery · aptX Adaptive", variant: "Graphite", price: 579_00, originalPrice: 1_299_00, stock: 6, listedAt: "2026-07-16" },
  { rank: 26, brand: "Sony", name: "WF-1000XM5", category: "audio", condition: "new", keySpec: "Processor V2 · 8-hour battery", variant: "Black", price: 899_00, stock: 12, listedAt: "2026-08-16" },

  /* ---------- Accessories ----------
     Shot individually rather than from the category render: these are the
     four listings where the material macros in the library genuinely
     depict the product rather than standing in for it. */
  { rank: 29, brand: "Apple", name: "Leather Folio Case", category: "accessories", condition: "new", keySpec: "For iPad Pro 11-inch", variant: "Black", price: 329_00, stock: 18, listedAt: "2026-08-10",
    image: { url: "/images/craft/craft-02.jpg", width: 1000, height: 1333, fit: "cover", alt: "Macro of the folio's soft black leather edge and stitched seam" } },
  { rank: 30, brand: "Apple", name: "96W USB-C Power Adapter", category: "accessories", condition: "open-box", keySpec: "96W · UAE three-pin", variant: "White", price: 179_00, originalPrice: 349_00, stock: 26, listedAt: "2026-07-11",
    image: { url: "/images/dropdown/6.jpg", width: 4500, height: 4000, fit: "cover", alt: "A white power adapter seated in a twin wall socket" } },
  { rank: 31, brand: "Rewire", name: "Braided USB-C Cable", category: "accessories", condition: "new", keySpec: "2m · 240W USB-C to USB-C", variant: "Graphite", price: 129_00, stock: 40, listedAt: "2026-08-18",
    image: { url: "/images/craft/craft-01.jpg", width: 1000, height: 1333, fit: "cover", alt: "Macro of the braided cable against the embossed Rewire sleeve" } },
  { rank: 32, brand: "Rewire", name: "Protective Laptop Sleeve", category: "accessories", condition: "new", keySpec: "For 14-inch laptops", variant: "Charcoal", price: 249_00, stock: 22, listedAt: "2026-08-03",
    image: { url: "/images/craft/craft-03.jpg", width: 1000, height: 1333, fit: "cover", alt: "Macro of the sleeve's charcoal felted surface and rolled edge" } },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const products: ShopProduct[] = seeds.map((seed) => {
  const slug = seed.slug ?? slugify(`${seed.brand} ${seed.name}`);
  const base = seed.image ?? categoryImagery[seed.category];
  return {
    ...seed,
    ...AED,
    id: slug,
    slug,
    image: {
      ...base,
      id: `${slug}-image`,
      alt:
        base.alt ??
        `${seed.brand} ${seed.name} in ${seed.variant ?? "its listed finish"}, on a lit studio stage`,
    },
  };
});

export function getShopProducts(): ShopProduct[] {
  return products;
}

/** Route for a listing. One place, so the product page can move without a sweep. */
export function productHref(product: ShopProduct) {
  return `/products/${product.slug}`;
}

/** Percentage saved. Returns 0 when there is nothing to claim. */
export function savingPercent(product: ShopProduct) {
  if (!product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

/* ============================================================
   Filtering, sorting, facets
   ============================================================ */

export interface ShopFilters {
  categories: CategorySlug[];
  conditions: Condition[];
  brands: string[];
  grades: Grade[];
  storage: string[];
  priceBands: string[];
}

export const emptyFilters: ShopFilters = {
  categories: [],
  conditions: [],
  brands: [],
  grades: [],
  storage: [],
  priceBands: [],
};

export function activeFilterCount(filters: ShopFilters) {
  return Object.values(filters).reduce((total, list) => total + list.length, 0);
}

/** Capacities, largest last — "1TB" must not sort between "128GB" and "256GB". */
function storageBytes(label: string) {
  const value = parseFloat(label);
  return label.toUpperCase().includes("TB") ? value * 1024 : value;
}

export function getStorageOptions(): string[] {
  const seen = new Set<string>();
  products.forEach((product) => {
    if (product.storage) seen.add(product.storage);
  });
  return [...seen].sort((a, b) => storageBytes(a) - storageBytes(b));
}

export function getBrands(): string[] {
  return [...new Set(products.map((product) => product.brand))].sort();
}

function matchesBand(price: number, bandId: string) {
  const band = priceBands.find((entry) => entry.id === bandId);
  return band ? price >= band.min && price < band.max : true;
}

/**
 * One predicate per axis, each ignored while its list is empty. Written
 * as a record rather than a chain so `facetCounts` can re-run every axis
 * *except one* — which is what makes the number beside each checkbox
 * describe the result of ticking that checkbox.
 */
const predicates: Record<
  keyof ShopFilters,
  (product: ShopProduct, filters: ShopFilters) => boolean
> = {
  categories: (product, f) => !f.categories.length || f.categories.includes(product.category),
  conditions: (product, f) => !f.conditions.length || f.conditions.includes(product.condition),
  brands: (product, f) => !f.brands.length || f.brands.includes(product.brand),
  grades: (product, f) => !f.grades.length || (!!product.grade && f.grades.includes(product.grade)),
  storage: (product, f) => !f.storage.length || (!!product.storage && f.storage.includes(product.storage)),
  priceBands: (product, f) =>
    !f.priceBands.length || f.priceBands.some((band) => matchesBand(product.price, band)),
};

const axes = Object.keys(predicates) as (keyof ShopFilters)[];

export function filterProducts(filters: ShopFilters, except?: keyof ShopFilters) {
  return products.filter((product) =>
    axes.every((axis) => axis === except || predicates[axis](product, filters)),
  );
}

export type SortId = "recommended" | "newest" | "price-asc" | "price-desc";

export const sortOptions: { id: SortId; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
];

export function sortProducts(list: ShopProduct[], sort: SortId): ShopProduct[] {
  const sorted = [...list];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    default:
      return sorted.sort((a, b) => a.rank - b.rank);
  }
}

/**
 * How many results an option *would* leave, counted against every other
 * axis but its own. A count of zero disables the row rather than hiding
 * it — options that appear and vanish as boxes are ticked make a filter
 * panel feel broken even while it is behaving correctly.
 */
export function facetCounts(
  filters: ShopFilters,
  axis: keyof ShopFilters,
  values: string[],
): Record<string, number> {
  const pool = filterProducts(filters, axis);
  const read: Record<keyof ShopFilters, (product: ShopProduct) => string | undefined> = {
    categories: (product) => product.category,
    conditions: (product) => product.condition,
    brands: (product) => product.brand,
    grades: (product) => product.grade,
    storage: (product) => product.storage,
    priceBands: (product) => priceBands.find((band) => matchesBand(product.price, band.id))?.id,
  };
  return Object.fromEntries(
    values.map((value) => [value, pool.filter((product) => read[axis](product) === value).length]),
  );
}

/** Listings per category, for the counts on the category rail. */
export function categoryCounts(): Record<CategorySlug | "all", number> {
  const counts = Object.fromEntries(
    shopCategories.map((category) => [
      category.slug,
      products.filter((product) => product.category === category.slug).length,
    ]),
  ) as Record<CategorySlug | "all", number>;
  counts.all = products.length;
  return counts;
}
