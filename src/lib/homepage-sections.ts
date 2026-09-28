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
] as const;
export type HomepageSectionType = (typeof HOMEPAGE_SECTION_TYPES)[number];

/** The types staff can add and delete. Everything else is part of the page. */
export const ADDABLE_SECTION_TYPES = [
  "PROMO_BANNER",
  "FEATURED_BRANDS",
  "FEATURED_CATEGORIES",
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

export interface SectionTypeRule {
  label: string;
  /** Part of the page: can be moved and hidden, never added or deleted. */
  fixed: boolean;
  required: readonly SectionTextField[];
  optional: readonly SectionTextField[];
  image: boolean;
  seasonal: boolean;
  /** What `refIds` points at, or null when the type has no items to choose. */
  refs: "brands" | "categories" | null;
}

/**
 * A fixed type exposes exactly the slots its component had static copy in.
 * The Hero has no button; the Invitation's button opens the waitlist, so it
 * has a label and no link.
 */
export const SECTION_RULES: Record<HomepageSectionType, SectionTypeRule> = {
  HERO: {
    label: "Hero",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "description"],
    image: false,
    seasonal: false,
    refs: null,
  },
  UPCOMING_DROPS: {
    label: "Upcoming drops",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    seasonal: false,
    refs: null,
  },
  BEST_SELLERS: {
    label: "Best sellers",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    seasonal: false,
    refs: null,
  },
  CONDITIONS: {
    label: "Conditions",
    fixed: true,
    required: ["title"],
    optional: ["eyebrow", "subtitle"],
    image: false,
    seasonal: false,
    refs: null,
  },
  TESTIMONIALS: {
    label: "Testimonials",
    fixed: true,
    required: ["title"],
    optional: ["subtitle"],
    image: false,
    seasonal: false,
    refs: null,
  },
  FAQ: {
    label: "FAQ",
    fixed: true,
    required: ["title"],
    optional: ["subtitle"],
    image: false,
    seasonal: false,
    refs: null,
  },
  INVITATION: {
    label: "Invitation",
    fixed: true,
    required: ["title", "ctaLabel"],
    optional: ["subtitle"],
    image: false,
    seasonal: false,
    refs: null,
  },
  PROMO_BANNER: {
    label: "Promo banner",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "description", "ctaLabel", "ctaHref"],
    image: true,
    seasonal: true,
    refs: null,
  },
  FEATURED_BRANDS: {
    label: "Featured brands",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    seasonal: false,
    refs: "brands",
  },
  FEATURED_CATEGORIES: {
    label: "Featured categories",
    fixed: false,
    required: ["title"],
    optional: ["eyebrow", "subtitle", "ctaLabel", "ctaHref"],
    image: false,
    seasonal: false,
    refs: "categories",
  },
};

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
  seasonal: boolean;
  refIds: string[];
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

  if (!rule.image && input.imageId) add("imageId", `A ${noun} section has no image.`);
  if (!rule.seasonal && input.seasonal) add("seasonal", `A ${noun} section can't be marked seasonal.`);

  if (rule.refs === null && input.refIds.length > 0) {
    add("refIds", `A ${noun} section has no items to choose.`);
  } else if (rule.refs !== null && input.refIds.length === 0) {
    add("refIds", rule.refs === "brands" ? "Choose at least one brand." : "Choose at least one category.");
  }

  return errors;
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

/** A stored title split into the heading's lines. */
export function headingLines(title: string): string[] {
  return title
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
