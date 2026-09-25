/**
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

export function resolveCategory(segment: string): string {
  const slug = segment.toLowerCase();
  return categoryAliases[slug] ?? slug;
}

/* ============================================================
   Popular search terms → the shop, pre-filtered
   ============================================================ */

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
   Routes and sorting
   ============================================================ */

export function productHref(product: { slug: string }) {
  return `/product/${product.slug}`;
}

export type SortId = "newest" | "price-asc" | "price-desc";

export const sortOptions: { id: SortId; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
];
