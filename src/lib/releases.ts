export const RELEASE_STATUSES = ["UPCOMING", "LIVE", "ENDED", "OFF"] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  UPCOMING: "Upcoming",
  LIVE: "Live",
  ENDED: "Ended",
  OFF: "Off",
};

export interface ReleaseWindow {
  active: boolean;
  startsAt: Date;
  endsAt: Date | null;
}

export function releaseStatus(release: ReleaseWindow, now: Date): ReleaseStatus {
  if (!release.active) return "OFF";
  if (now < release.startsAt) return "UPCOMING";
  if (release.endsAt && now >= release.endsAt) return "ENDED";
  return "LIVE";
}
