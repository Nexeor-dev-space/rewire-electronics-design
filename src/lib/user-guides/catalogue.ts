import { HELP_GUIDE_IMAGE_BASE } from "@/lib/constants";
import { ADMIN_GUIDES } from "./admin-guides";
import { CUSTOMER_GUIDES } from "./customer-guides";
import type { Guide, GuideAudience, GuideDefinition, GuideSection } from "./types";

/**
 * The guides that exist. Staff edit their text and media, but the list itself
 * is code: adding a guide means adding it to its file in this folder.
 */

/** The date the built in text was last changed. Update it when you edit the text in this folder. */
export const GUIDE_TEXT_UPDATED = "2026-11-23";

export const GUIDE_AUDIENCE_LABELS: Record<GuideAudience, string> = {
  customer: "Customer guides",
  admin: "Admin guides",
};

const DEFINITIONS: Record<GuideAudience, GuideDefinition[]> = {
  customer: CUSTOMER_GUIDES,
  admin: ADMIN_GUIDES,
};

export function guideDefinitions(audience: GuideAudience): GuideDefinition[] {
  return DEFINITIONS[audience];
}

export function findGuideDefinition(audience: GuideAudience, slug: string): GuideDefinition | null {
  return DEFINITIONS[audience].find((guide) => guide.slug === slug) ?? null;
}

export function isGuideAudience(value: string): value is GuideAudience {
  return value === "customer" || value === "admin";
}

/** The built in text, shaped like a saved guide. */
export function defaultGuide(definition: GuideDefinition): Guide {
  // Steps are numbered across the whole guide, which names their sample screenshot.
  let stepNumber = 0;
  const sections: GuideSection[] = definition.sections.map((section) => ({
    id: section.id,
    title: section.title,
    intro: section.intro,
    steps: (section.steps ?? []).map((text) => {
      stepNumber += 1;
      return {
        text,
        imageId: null,
        imageUrl: `${HELP_GUIDE_IMAGE_BASE}/${definition.slug}/step-${stepNumber}.png`,
      };
    }),
    notes: section.notes ?? [],
  }));

  return {
    slug: definition.slug,
    audience: definition.audience,
    title: definition.title,
    summary: definition.summary,
    available: definition.available,
    recordingUrl: null,
    sections,
    updatedAt: GUIDE_TEXT_UPDATED,
    edited: false,
  };
}
