import type { GuideAudience, GuideDefinition, SourceSection } from "./types";

/**
 * Every guide has the same five parts: what it is for, who can do it, the
 * steps, what happens next and common problems. `defineGuide` builds them
 * from plain fields so a guide reads the same wherever it is opened.
 */

interface GuideText {
  purpose: string;
  /** Who can do the task. */
  who: string;
  steps: string[];
  /** Extra named task lists after the main steps. */
  more?: SourceSection[];
  next: string[];
  problems: string[];
}

export const GUIDE_PART_TITLES = {
  purpose: "What this is for",
  who: "Who can do it",
  steps: "Steps",
  next: "What happens next",
  problems: "Common problems",
} as const;

export function defineGuide(
  audience: GuideAudience,
  slug: string,
  title: string,
  summary: string,
  text: GuideText,
): GuideDefinition {
  return {
    slug,
    audience,
    title,
    summary,
    available: true,
    sections: [
      { id: "purpose", title: GUIDE_PART_TITLES.purpose, intro: text.purpose },
      { id: "who", title: GUIDE_PART_TITLES.who, intro: text.who },
      { id: "steps", title: GUIDE_PART_TITLES.steps, steps: text.steps },
      ...(text.more ?? []),
      { id: "next", title: GUIDE_PART_TITLES.next, notes: text.next },
      { id: "problems", title: GUIDE_PART_TITLES.problems, notes: text.problems },
    ],
  };
}

/** A guide for a module that is still a placeholder. It describes nothing planned. */
export function unavailableGuide(slug: string, title: string): GuideDefinition {
  return {
    slug,
    audience: "admin",
    title,
    summary: "This screen is not yet available.",
    available: false,
    sections: [
      {
        id: "status",
        title: "Not yet available",
        intro: `${title} is not available yet. This guide will be filled in when the screen is ready.`,
      },
    ],
  };
}
