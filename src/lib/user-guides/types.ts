/**
 * A guide is a title, a summary, an optional screen recording and a list of
 * sections. Each section holds an intro line, numbered steps (each with an
 * optional screenshot) and closing notes. Client safe: no Prisma import.
 */

export interface GuideStep {
  text: string;
  /** A `MediaAsset` id for the step's screenshot, or null. */
  imageId: string | null;
  /** A screenshot from `public/`, used while no image is uploaded. Hidden if the file is missing. */
  imageUrl?: string | null;
}

export interface GuideSection {
  /** Anchor for the contents list. Unique within a guide. */
  id: string;
  title: string;
  intro?: string;
  steps: GuideStep[];
  notes: string[];
}

export type GuideAudience = "customer" | "admin";

/** A guide as the built in text defines it. Steps are plain sentences. */
export interface GuideDefinition {
  /** Stable for the life of the guide: it is the URL and the database key. */
  slug: string;
  audience: GuideAudience;
  title: string;
  summary: string;
  /** False for a module that is still a placeholder: the page says so. */
  available: boolean;
  sections: SourceSection[];
}

export interface SourceSection {
  id: string;
  title: string;
  intro?: string;
  steps?: string[];
  notes?: string[];
}

/** A guide ready to show: the built in text, or the staff edited version. */
export interface Guide {
  slug: string;
  audience: GuideAudience;
  title: string;
  summary: string;
  available: boolean;
  recordingUrl: string | null;
  sections: GuideSection[];
  /** ISO date of the last edit, or the date of the built in text. */
  updatedAt: string;
  /** True once staff have saved their own version. */
  edited: boolean;
}
