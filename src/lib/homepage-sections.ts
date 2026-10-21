/**
 * Homepage section rules — which fields each section type carries, which it
 * requires, and which types staff may add. `homepage.service.ts` checks every
 * write against this one table, and the Page Builder's form should read it
 * too, so the two cannot disagree about what a section may hold.
 *
 * Client-safe on purpose: no Prisma, no Next, no `server-only`, so client
 * components and `prisma/seed.ts` can import it.
 */

export const HOMEPAGE_SECTION_TYPES = [
  "HERO",
  "UPCOMING_DROPS",
  "BEST_SELLERS",
  "CONDITIONS",
  "TESTIMONIALS",
  "FAQ",
  "INVITATION",
  "PROMO_BANNER",
  "FEATURED_BRANDS",
  "FEATURED_CATEGORIES",
  "BEST_DEALS",
  "SEASON_DEALS",
] as const;
export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

/** The types staff can add and delete. Everything else is part of the page. */
export const ADDABLE_SECTION_TYPES = [
  "PROMO_BANNER",
  "FEATURED_BRANDS",
  "FEATURED_CATEGORIES",
  "BEST_DEALS",
  "SEASON_DEALS",
] as const satisfies readonly HomepageSectionType[];
export type AddableSectionType = (typeof ADDABLE_SECTION_TYPES)[number];

export function isAddableSectionType(type: HomepageSectionType): type is AddableSectionType {
  return (ADDABLE_SECTION_TYPES as readonly HomepageSectionType[]).includes(type);
}

export const SECTION_TEXT_FIELDS = [
  "eyebrow",
  "title",
  "subtitle",
  "description",
  "ctaLabel",
  "ctaHref",
] as const;
export type SectionTextField = (typeof SECTION_TEXT_FIELDS)[number];

export const SECTION_FIELD_LABELS: Record<SectionTextField, string> = {
  eyebrow: "Eyebrow",
  title: "Title",
  subtitle: "Subtitle",
  description: "Description",
  ctaLabel: "Button label",
  ctaHref: "Button link",
};

export const SECTION_TEXT_LIMITS: Record<SectionTextField, number> = {
  eyebrow: 60,
  title: 120,
  subtitle: 300,
  description: 600,
  ctaLabel: 40,
  ctaHref: 300,
};

/** Keeps the admin API's one list bounded — see docs/HOMEPAGE-CMS.md. */
export const MAX_HOMEPAGE_SECTIONS = 30;
export const MAX_SECTION_REFS = 12;
export const MAX_SECTION_ITEMS = 12;

/** What a section's `items` hold. */
export type SectionItemKind = "drops" | "products" | "reviews" | "categories" | "deals";

export interface SectionTypeRule {
  label: string;
  /** Part of the page: can be moved and hidden, never added or deleted. */
  fixed: boolean;
  required: readonly SectionTextField[];
  optional: readonly SectionTextField[];
  image: boolean;
  /** A separate image for phones. Only with `image`. */
  mobileImage: boolean;
  seasonal: boolean;
  /** What `refIds` points at, or null when the type has no brands to choose. */
  refs: "brands" | null;
  /** What `items` holds, or null when the type has none. */
  items: SectionItemKind | null;
  singleton: boolean;
  schedule: boolean;
  discountHint: boolean;
}

/**
 * A fixed type exposes exactly the slots its component renders. The
 * Invitation's button opens the waitlist, so it has a label and no link.
 */
export const SECTION_RULES: Record<HomepageSectionType, SectionTypeRule> = {
  HERO: {
    label: "Hero",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "description", "ctaLabel", "ctaHref"],
    image: true,
    mobileImage: true,
    seasonal: false,
    refs: null,
    items: null,
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  UPCOMING_DROPS: {
    label: "Upcoming drops",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: "drops",
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  BEST_SELLERS: {
    label: "Just listed",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: "products",
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  CONDITIONS: {
    label: "Conditions",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle"],
    image: false,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: null,
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  TESTIMONIALS: {
    label: "Reviews",
    fixed: true,
    required: ["title"],
    optional: ["subtitle"],
    image: false,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: "reviews",
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  FAQ: {
    label: "FAQ",
    fixed: true,
    required: ["title"],
    optional: ["subtitle"],
    image: false,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: null,
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  INVITATION: {
    label: "Invitation",
    fixed: true,
    required: ["title", "ctaLabel"],
    optional: ["subtitle"],
    image: false,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: null,
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  PROMO_BANNER: {
    label: "Promo banner",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "description", "ctaLabel", "ctaHref"],
    image: true,
    mobileImage: false,
    seasonal: true,
    refs: null,
    items: null,
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  FEATURED_BRANDS: {
    label: "Featured brands",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    mobileImage: false,
    seasonal: false,
    refs: "brands",
    items: null,
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  FEATURED_CATEGORIES: {
    label: "Featured categories",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: "categories",
    singleton: false,
    schedule: false,
    discountHint: false,
  },
  BEST_DEALS: {
    label: "Best deals",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "description", "ctaLabel", "ctaHref"],
    image: true,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: "products",
    singleton: true,
    schedule: false,
    discountHint: true,
  },
  SEASON_DEALS: {
    label: "Season deals",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "description", "ctaLabel", "ctaHref"],
    image: true,
    mobileImage: false,
    seasonal: false,
    refs: null,
    items: "deals",
    singleton: true,
    schedule: true,
    discountHint: true,
  },
};

/* ---------- items ---------- */

export const ITEM_TEXT_FIELDS = ["title", "body", "author", "ctaLabel", "ctaHref"] as const;
export type ItemTextField = (typeof ITEM_TEXT_FIELDS)[number];

export const ITEM_TEXT_LIMITS: Record<ItemTextField, number> = {
  title: 120,
  body: 600,
  author: 60,
  ctaLabel: 40,
  ctaHref: 300,
};

/** Every field an item can carry, for "which may this kind fill". */
export type ItemField =
  | ItemTextField
  | "productId"
  | "categoryId"
  | "rating"
  | "releaseAt"
  | "imageId";

const ITEM_FIELDS: readonly ItemField[] = [
  ...ITEM_TEXT_FIELDS,
  "productId",
  "categoryId",
  "rating",
  "releaseAt",
  "imageId",
];

const ITEM_FIELD_NOUNS: Record<ItemField, string> = {
  title: "title",
  body: "text",
  author: "customer name",
  ctaLabel: "button label",
  ctaHref: "button link",
  productId: "product",
  categoryId: "category",
  rating: "rating",
  releaseAt: "release date",
  imageId: "image",
};

export interface ItemKindRule {
  /** One item, for messages: "drop", "product", "review". */
  noun: string;
  fields: readonly ItemField[];
}

/**
 * - **Drops** take a product, which supplies the name, picture, price and
 *   stock; or, for a release not yet in the catalogue, a title, an image and
 *   a release date of their own.
 * - **Products** are Just Listed picks: a product and nothing else.
 * - **Reviews** are written in: quote and customer required, the product
 *   bought, a rating and an avatar optional.
 */
export const ITEM_RULES: Record<SectionItemKind, ItemKindRule> = {
  drops: {
    noun: "drop",
    fields: ["productId", "title", "releaseAt", "ctaLabel", "ctaHref", "imageId"],
  },
  products: { noun: "product", fields: ["productId"] },
  reviews: { noun: "review", fields: ["body", "author", "title", "rating", "imageId"] },
  categories: { noun: "category", fields: ["categoryId", "title", "imageId", "ctaHref"] },
  deals: { noun: "deal", fields: ["productId", "title", "imageId", "ctaHref"] },
};

export interface SectionItemFieldsInput {
  visible: boolean;
  productId: string | null;
  categoryId: string | null;
  title: string | null;
  body: string | null;
  author: string | null;
  rating: number | null;
  /** ISO string. */
  releaseAt: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageId: string | null;
}

/**
 * Field errors for one item under `kind`'s rules, keyed by field. Like
 * sections, a field the kind doesn't carry is refused rather than dropped.
 */
export function checkItemFields(
  kind: SectionItemKind,
  item: SectionItemFieldsInput,
): Partial<Record<ItemField, string[]>> {
  const { noun, fields } = ITEM_RULES[kind];
  const errors: Partial<Record<ItemField, string[]>> = {};
  const add = (field: ItemField, message: string) => {
    (errors[field] ??= []).push(message);
  };

  for (const field of ITEM_FIELDS) {
    if (!fields.includes(field) && item[field] !== null) {
      add(field, `A ${noun} has no ${ITEM_FIELD_NOUNS[field]}.`);
    }
  }

  if (kind === "products" && !item.productId) add("productId", "Choose a product.");
  if (kind === "categories" && !item.categoryId) add("categoryId", "Choose a category.");

  if (kind === "deals" && item.productId) {
    if (item.title) add("title", "A product deal takes its name from the product.");
    if (item.imageId) add("imageId", "A product deal uses the product's photos.");
    if (item.ctaHref) add("ctaHref", "A product deal links to its product page.");
  }

  if (kind === "deals" && !item.productId) {
    if (!item.title) add("title", "Choose a product, or enter a title.");
    if (!item.imageId) add("imageId", "Choose a product, or upload an image.");
    if (!item.ctaHref) add("ctaHref", "Choose a product, or enter a link.");
  }

  if (kind === "drops" && !item.productId) {
    // A release not in the catalogue yet: it needs its own name, picture and date.
    if (!item.title) add("title", "Choose a product, or enter a title.");
    if (!item.imageId) add("imageId", "Choose a product, or upload an image.");
    if (!item.releaseAt) add("releaseAt", "Choose a product, or set a release date.");
  }

  if (kind === "reviews") {
    if (!item.body) add("body", "Enter the review.");
    if (!item.author) add("author", "Enter the customer's name.");
  }

  if (fields.includes("ctaLabel") && Boolean(item.ctaLabel) !== Boolean(item.ctaHref)) {
    add(item.ctaLabel ? "ctaHref" : "ctaLabel", "Fill in both the button label and link, or neither.");
  }

  return errors;
}

/** The text fields `type` carries, in form order. */
export function sectionFields(type: HomepageSectionType): SectionTextField[] {
  const rule = SECTION_RULES[type];
  return SECTION_TEXT_FIELDS.filter(
    (field) => rule.required.includes(field) || rule.optional.includes(field),
  );
}

export interface SectionFieldsInput {
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageId: string | null;
  mobileImageId: string | null;
  seasonal: boolean;
  startsAt: string | null;
  endsAt: string | null;
  refIds: string[];
  items: SectionItemFieldsInput[];
}

/**
 * Field errors for `input` under `type`'s rules — empty when it is valid.
 * Fields a type does not carry are refused, not silently dropped, so a
 * client that sends them learns so.
 */
export function checkSectionFields(
  type: HomepageSectionType,
  input: SectionFieldsInput,
): Record<string, string[]> {
  const rule = SECTION_RULES[type];
  const allowed = sectionFields(type);
  const errors: Record<string, string[]> = {};
  const add = (field: string, message: string) => {
    (errors[field] ??= []).push(message);
  };
  const noun = rule.label.toLowerCase();

  for (const field of SECTION_TEXT_FIELDS) {
    const label = SECTION_FIELD_LABELS[field].toLowerCase();
    if (rule.required.includes(field) && !input[field]) {
      add(field, `Enter a ${label}.`);
    } else if (!allowed.includes(field) && input[field]) {
      add(field, `A ${noun} section has no ${label}.`);
    }
  }

  const hasLink = allowed.includes("ctaLabel") && allowed.includes("ctaHref");
  if (hasLink && Boolean(input.ctaLabel) !== Boolean(input.ctaHref)) {
    add(input.ctaLabel ? "ctaHref" : "ctaLabel", "Fill in both the button label and link, or neither.");
  }

  if (rule.schedule) {
    if (!input.startsAt) add("startsAt", "Set when the deals start.");
    if (!input.endsAt) add("endsAt", "Set when the deals end.");
    else if (input.startsAt && Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
      add("endsAt", "End after the start.");
    }
  } else {
    if (input.startsAt) add("startsAt", `A ${noun} section has no start date.`);
    if (input.endsAt) add("endsAt", `A ${noun} section has no end date.`);
  }

  if (!rule.image && input.imageId) add("imageId", `A ${noun} section has no image.`);
  if (!rule.mobileImage && input.mobileImageId) {
    add("mobileImageId", `A ${noun} section has no mobile image.`);
  } else if (input.mobileImageId && !input.imageId) {
    add("mobileImageId", "Add the main image first. Phones fall back to it.");
  }
  if (!rule.seasonal && input.seasonal) add("seasonal", `A ${noun} section can't be marked seasonal.`);

  if (rule.refs === null && input.refIds.length > 0) {
    add("refIds", `A ${noun} section has no items to choose.`);
  } else if (rule.refs !== null && input.refIds.length === 0) {
    add("refIds", "Choose at least one brand.");
  }

  if (rule.items === null) {
    if (input.items.length > 0) add("items", `A ${noun} section has no items.`);
  } else {
    const kind = rule.items;
    input.items.forEach((item, index) => {
      for (const [field, messages] of Object.entries(checkItemFields(kind, item))) {
        for (const message of messages ?? []) add(itemErrorKey(index, field as ItemField), message);
      }
    });
    if (kind === "categories") {
      if (input.items.length === 0) add("items", "Choose at least one category.");
      const ids = input.items.flatMap((item) => (item.categoryId ? [item.categoryId] : []));
      if (new Set(ids).size !== ids.length) add("items", "Each category can only be chosen once.");
    } else if (kind !== "reviews") {
      const ids = input.items.flatMap((item) => (item.productId ? [item.productId] : []));
      if (new Set(ids).size !== ids.length) add("items", "Each product can only be chosen once.");
    }
  }

  return errors;
}

/** Where an item's field error lands: `items.2.title`. */
export function itemErrorKey(index: number, field: ItemField): string {
  return `items.${index}.${field}`;
}

/**
 * Anywhere in a link: whitespace, control characters or a backslash. Browsers
 * strip tabs and newlines before parsing and read `\` as `/`, so `/\t/host`
 * and `/\host` both resolve to the absolute `//host`.
 */
const UNSAFE_HREF_CHARS = /[\s\\\x00-\x1f\x7f]/;

/**
 * Site paths (`/collection`) and https links. Not `//host`, or anything a
 * browser would rewrite into it.
 */
export function isSafeHref(href: string): boolean {
  if (UNSAFE_HREF_CHARS.test(href)) return false;
  if (href.startsWith("/")) return !href.startsWith("//");
  try {
    return new URL(href).protocol === "https:";
  } catch {
    return false;
  }
}

export function isWithinSchedule(startsAt: Date | null, endsAt: Date | null, now: Date): boolean {
  return startsAt !== null && endsAt !== null && startsAt <= now && now < endsAt;
}

/** A stored title split into the heading's lines. */
export function headingLines(title: string): string[] {
  return title
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
