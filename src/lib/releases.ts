import { RELEASE_EARLY_END_OPENING_SHIFT_MS, RELEASES_PAGE_PATH } from "./constants";

export const RELEASE_STATUSES = ["DRAFT", "UPCOMING", "LIVE", "SOLD_OUT", "COMPLETED"] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  DRAFT: "Draft",
  UPCOMING: "Upcoming",
  LIVE: "Live",
  SOLD_OUT: "Sold out",
  COMPLETED: "Completed",
};

export const RELEASE_SORTS = ["opens_desc", "opens_asc"] as const;

export type ReleaseSort = (typeof RELEASE_SORTS)[number];

export const RELEASE_SORT_LABELS: Record<ReleaseSort, string> = {
  opens_desc: "Opening, latest first",
  opens_asc: "Opening, earliest first",
};

export const RELEASE_STATE_ACTIONS = ["PUBLISH", "UNPUBLISH", "END"] as const;

export type ReleaseStateAction = (typeof RELEASE_STATE_ACTIONS)[number];

export const RELEASE_STATE_ACTION_FROM: Record<ReleaseStateAction, readonly ReleaseStatus[]> = {
  PUBLISH: ["DRAFT"],
  UNPUBLISH: ["UPCOMING"],
  END: ["UPCOMING", "LIVE", "SOLD_OUT"],
};

export const RELEASE_STATE_ACTION_LABELS: Record<ReleaseStateAction, string> = {
  PUBLISH: "Publish",
  UNPUBLISH: "Unpublish",
  END: "End release",
};

const DELETABLE_STATUSES: readonly ReleaseStatus[] = ["DRAFT", "UPCOMING"];

export interface ReleaseTimeline {
  publishedAt: Date | null;
  completedAt: Date | null;
  startsAt: Date;
  endsAt: Date | null;
}

export function releaseStatus(release: ReleaseTimeline, totalAvailable: number, now: Date): ReleaseStatus {
  if (!release.publishedAt) return "DRAFT";
  if (release.completedAt || (release.endsAt && release.endsAt <= now)) return "COMPLETED";
  if (now < release.startsAt) return "UPCOMING";
  if (totalAvailable === 0) return "SOLD_OUT";
  return "LIVE";
}

export interface ReleaseEdits {
  text: boolean;
  hidden: boolean;
  maxPerCustomer: boolean;
  startsAt: boolean;
  endsAt: boolean;
  allocations: boolean;
}

const ALL_EDITS: ReleaseEdits = {
  text: true,
  hidden: true,
  maxPerCustomer: true,
  startsAt: true,
  endsAt: true,
  allocations: true,
};

const OPEN_EDITS: ReleaseEdits = { ...ALL_EDITS, startsAt: false };

const COMPLETED_EDITS: ReleaseEdits = {
  text: true,
  hidden: true,
  maxPerCustomer: false,
  startsAt: false,
  endsAt: false,
  allocations: false,
};

const EDITS_BY_STATUS: Record<ReleaseStatus, ReleaseEdits> = {
  DRAFT: ALL_EDITS,
  UPCOMING: ALL_EDITS,
  LIVE: OPEN_EDITS,
  SOLD_OUT: OPEN_EDITS,
  COMPLETED: COMPLETED_EDITS,
};

export function allowedEdits(status: ReleaseStatus): ReleaseEdits {
  return EDITS_BY_STATUS[status];
}

export function canChangeState(status: ReleaseStatus, action: ReleaseStateAction): boolean {
  return RELEASE_STATE_ACTION_FROM[action].includes(status);
}

export function canDeleteRelease(status: ReleaseStatus): boolean {
  return DELETABLE_STATUSES.includes(status);
}

export interface AllocationUnits {
  allocated: number;
  reserved: number;
  sold: number;
  returned: number;
}

export function canDropAllocation(units: AllocationUnits, release: ReleaseTimeline, now: Date): boolean {
  if (units.reserved + units.sold + units.returned > 0) return false;
  return units.allocated === 0 || releaseStatus(release, 0, now) === "COMPLETED";
}

export interface PublishCheck {
  startsAt: Date;
  endsAt: Date | null;
  maxPerCustomer: number;
  totalAllocated: number;
}

export function publishBlocker(release: PublishCheck, now: Date): string | null {
  if (release.totalAllocated < 1) return "Allocate at least one unit before publishing.";
  if (!release.endsAt) return "Set an end time before publishing.";
  if (release.endsAt <= release.startsAt) return "The end time must be after the opening time.";
  if (release.endsAt <= now) return "The end time has passed. Set a later one before publishing.";
  if (release.maxPerCustomer < 1) return "Allow each customer at least one unit.";
  return null;
}

export function releaseHref(slug: string): string {
  return `${RELEASES_PAGE_PATH}/${slug}`;
}

export function endedWindow(startsAt: Date, now: Date): { startsAt: Date; endsAt: Date } {
  if (startsAt < now) return { startsAt, endsAt: now };
  return { startsAt: new Date(now.getTime() - RELEASE_EARLY_END_OPENING_SHIFT_MS), endsAt: now };
}
