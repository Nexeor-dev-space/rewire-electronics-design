import { z } from "zod";
import {
  ADDABLE_SECTION_TYPES,
  ITEM_TEXT_LIMITS,
  MAX_HOMEPAGE_SECTIONS,
  MAX_SECTION_ITEMS,
  MAX_SECTION_REFS,
  SECTION_TEXT_LIMITS,
  isSafeHref,
} from "@/lib/homepage-sections";
import { SEO_DESCRIPTION_MAX_LENGTH, SEO_TITLE_MAX_LENGTH } from "@/lib/constants";
import { idValidator, isoDateTimeValidator, optionalTextValidator } from "./common/primitives.validator";

export const homepageSeoSchema = z.object({
  seoTitle: optionalTextValidator(SEO_TITLE_MAX_LENGTH),
  metaDescription: optionalTextValidator(SEO_DESCRIPTION_MAX_LENGTH),
  ogImageId: idValidator.nullable().default(null),
});

/**
 * The shape every section body shares. Which fields a given type may fill is
 * checked afterwards by `checkSectionFields`, because an update's type comes
 * from the stored row, not from the body.
 */

/** Trimmed; an empty string is stored as null. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .nullable()
    .default(null)
    .transform((value) => value || null);
}

const SAFE_HREF_MESSAGE = "Use a site path such as /collection, or an https:// link.";

function optionalHref(max: number) {
  return optionalText(max).refine((value) => value === null || isSafeHref(value), SAFE_HREF_MESSAGE);
}

/** One drop, picked product, review or category. Which fields its kind may fill is `checkItemFields`. */
export const homepageSectionItemSchema = z.object({
  visible: z.boolean().default(true),
  productId: idValidator.nullable().default(null),
  categoryId: idValidator.nullable().default(null),
  title: optionalText(ITEM_TEXT_LIMITS.title),
  body: optionalText(ITEM_TEXT_LIMITS.body),
  author: optionalText(ITEM_TEXT_LIMITS.author),
  rating: z
    .number()
    .int("Choose a whole number of stars.")
    .min(1, "Choose 1 to 5 stars.")
    .max(5, "Choose 1 to 5 stars.")
    .nullable()
    .default(null),
  releaseAt: z.iso
    .datetime({ offset: true, error: "Enter a valid date and time." })
    .nullable()
    .default(null),
  ctaLabel: optionalText(ITEM_TEXT_LIMITS.ctaLabel),
  ctaHref: optionalHref(ITEM_TEXT_LIMITS.ctaHref),
  imageId: idValidator.nullable().default(null),
});

export const homepageSectionSchema = z.object({
  eyebrow: optionalText(SECTION_TEXT_LIMITS.eyebrow),
  title: optionalText(SECTION_TEXT_LIMITS.title),
  subtitle: optionalText(SECTION_TEXT_LIMITS.subtitle),
  description: optionalText(SECTION_TEXT_LIMITS.description),
  ctaLabel: optionalText(SECTION_TEXT_LIMITS.ctaLabel),
  ctaHref: optionalHref(SECTION_TEXT_LIMITS.ctaHref),
  imageId: idValidator.nullable().default(null),
  mobileImageId: idValidator.nullable().default(null),
  seasonal: z.boolean().default(false),
  startsAt: isoDateTimeValidator.nullable().default(null),
  endsAt: isoDateTimeValidator.nullable().default(null),
  visible: z.boolean().default(true),
  refIds: z
    .array(idValidator)
    .max(MAX_SECTION_REFS, `Choose ${MAX_SECTION_REFS} or fewer.`)
    .refine((ids) => new Set(ids).size === ids.length, "Each item can only be chosen once.")
    .default([]),
  /** Replaces the section's items, in display order. */
  items: z
    .array(homepageSectionItemSchema)
    .max(MAX_SECTION_ITEMS, `Add ${MAX_SECTION_ITEMS} or fewer.`)
    .default([]),
});

export const createHomepageSectionSchema = homepageSectionSchema.extend({
  type: z.enum(ADDABLE_SECTION_TYPES, { error: "Choose a section type." }),
});

export const reorderHomepageSchema = z.object({
  ids: z.array(idValidator).min(1).max(MAX_HOMEPAGE_SECTIONS),
});

/**
 * A section body's schema errors keyed by path, so an item's land on its own
 * input: `title`, `items`, `items.2.ctaHref` — the keys `checkSectionFields`
 * uses too. The API and the builder's form both report these.
 */
export function sectionIssueErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "body";
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}
