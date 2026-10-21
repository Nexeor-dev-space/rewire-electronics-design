/**
 * Pure helpers for the Homepage Builder screen. Client-safe: no Prisma, no
 * Next, no `server-only`. Field rules live in `homepage-sections.ts`; this
 * file only adapts them to the form.
 */

import { apiFieldErrors } from "@/lib/api/api-client";
import { checkSectionFields, type HomepageSectionType } from "@/lib/homepage-sections";
import type { CategoryNode } from "@/types/category";
import type {
  HomepageSection,
  HomepageSectionInput,
  HomepageSectionItem,
  HomepageSectionItemInput,
  SectionRef,
} from "@/types/homepage";
import { homepageSectionSchema, sectionIssueErrors } from "@/validators/homepage.validator";

/** A section body with every field present, as the form holds it. */
export type SectionFormInput = Required<HomepageSectionInput>;

/** An item body with every field present, as the form holds it. */
export type SectionItemFormInput = Required<HomepageSectionItemInput>;

/** `items` with the one at `index` moved one place; unchanged at the ends. */
export function swapItems<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** A draft section as the body its PUT expects. */
export function sectionToInput(section: HomepageSection): SectionFormInput {
  return {
    eyebrow: section.eyebrow,
    title: section.title,
    subtitle: section.subtitle,
    description: section.description,
    ctaLabel: section.ctaLabel,
    ctaHref: section.ctaHref,
    imageId: section.imageId,
    mobileImageId: section.mobileImageId,
    seasonal: section.seasonal,
    startsAt: section.startsAt,
    endsAt: section.endsAt,
    visible: section.visible,
    refIds: section.refs.map((ref) => ref.id),
    items: section.items.map(itemToInput),
  };
}

export function emptySectionInput(): SectionFormInput {
  return {
    eyebrow: null,
    title: null,
    subtitle: null,
    description: null,
    ctaLabel: null,
    ctaHref: null,
    imageId: null,
    mobileImageId: null,
    seasonal: false,
    startsAt: null,
    endsAt: null,
    visible: true,
    refIds: [],
    items: [],
  };
}

/** A draft item as the body its section's PUT expects. */
export function itemToInput(item: HomepageSectionItem): SectionItemFormInput {
  return {
    visible: item.visible,
    productId: item.productId,
    categoryId: item.categoryId,
    title: item.title,
    body: item.body,
    author: item.author,
    rating: item.rating,
    releaseAt: item.releaseAt,
    ctaLabel: item.ctaLabel,
    ctaHref: item.ctaHref,
    imageId: item.imageId,
  };
}

export function emptyItemInput(): SectionItemFormInput {
  return {
    visible: true,
    productId: null,
    categoryId: null,
    title: null,
    body: null,
    author: null,
    rating: null,
    releaseAt: null,
    ctaLabel: null,
    ctaHref: null,
    imageId: null,
  };
}

/**
 * The same checks the API runs, so obvious mistakes show before a round
 * trip: the shared schema first, then the type's rules on the parsed body.
 */
export function validateSection(
  type: HomepageSectionType,
  input: SectionFormInput,
): Record<string, string[]> {
  const parsed = homepageSectionSchema.safeParse(input);
  if (!parsed.success) return sectionIssueErrors(parsed.error);
  return checkSectionFields(type, parsed.data);
}

/**
 * The message to show for a failed write from the list, where no field is on
 * screen to highlight: the first field error ("Choose at least one brand.")
 * rather than the generic "Please check the highlighted fields.".
 */
export function rowErrorMessage(error: Error): string {
  const [first] = Object.values(apiFieldErrors(error)).flatMap((messages) => messages ?? []);
  return first ?? error.message;
}

/** The first non-empty line of a stored title, for list rows. */
export function firstLine(title: string | null): string {
  return (
    (title ?? "")
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

/** A category tree page as picker options: each parent, then its children. */
export function flattenCategoryRefs(nodes: CategoryNode[]): SectionRef[] {
  return nodes.flatMap((parent) => [
    { id: parent.id, name: parent.name },
    ...parent.children.map((child) => ({ id: child.id, name: `${parent.name} › ${child.name}` })),
  ]);
}
