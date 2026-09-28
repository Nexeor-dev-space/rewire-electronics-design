import { z } from "zod";
import {
  ADDABLE_SECTION_TYPES,
  MAX_HOMEPAGE_SECTIONS,
  MAX_SECTION_REFS,
  SECTION_TEXT_LIMITS,
  isSafeHref,
  type SectionTextField,
} from "@/lib/homepage-sections";
import { idValidator } from "./common/primitives.validator";

/**
 * The shape every section body shares. Which fields a given type may fill is
 * checked afterwards by `checkSectionFields`, because an update's type comes
 * from the stored row, not from the body.
 */

/** Trimmed; an empty string is stored as null. */
function optionalText(field: SectionTextField) {
  const max = SECTION_TEXT_LIMITS[field];
  return z
    .string()
    .trim()
    .max(max, `Use ${max} characters or fewer.`)
    .nullable()
    .default(null)
    .transform((value) => value || null);
}

export const homepageSectionSchema = z.object({
  eyebrow: optionalText("eyebrow"),
  title: optionalText("title"),
  subtitle: optionalText("subtitle"),
  description: optionalText("description"),
  ctaLabel: optionalText("ctaLabel"),
  ctaHref: optionalText("ctaHref").refine(
    (value) => value === null || isSafeHref(value),
    "Use a site path such as /collection, or an https:// link.",
  ),
  imageId: idValidator.nullable().default(null),
  seasonal: z.boolean().default(false),
  visible: z.boolean().default(true),
  refIds: z
    .array(idValidator)
    .max(MAX_SECTION_REFS, `Choose ${MAX_SECTION_REFS} or fewer.`)
    .refine((ids) => new Set(ids).size === ids.length, "Each item can only be chosen once.")
    .default([]),
});

export const createHomepageSectionSchema = homepageSectionSchema.extend({
  type: z.enum(ADDABLE_SECTION_TYPES, { error: "Choose a section type." }),
});

export const reorderHomepageSchema = z.object({
  ids: z.array(idValidator).min(1).max(MAX_HOMEPAGE_SECTIONS),
});
