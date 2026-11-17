/**
 * A user guide is a list of sections. Each section can hold an intro line,
 * numbered steps, named groups of steps, a table and closing notes. The
 * guide pages render them all the same way, so a new guide is only data.
 */

export interface GuideGroup {
  title: string;
  intro?: string;
  steps: string[];
  notes?: string[];
}

export interface GuideTable {
  head: string[];
  rows: string[][];
}

export interface GuideSection {
  /** Anchor for the contents list. Unique within a guide. */
  id: string;
  title: string;
  intro?: string;
  steps?: string[];
  groups?: GuideGroup[];
  table?: GuideTable;
  notes?: string[];
}

export interface UserGuide {
  title: string;
  description: string;
  sections: GuideSection[];
}
