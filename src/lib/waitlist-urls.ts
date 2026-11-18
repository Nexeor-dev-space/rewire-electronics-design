import "server-only";

import { appUrl } from "@/lib/app-url";
import { RELEASES_PAGE_PATH, WAITLIST_CONFIRM_PAGE_PATH, WAITLIST_LEAVE_PAGE_PATH } from "@/lib/constants";
import { releaseHref } from "@/lib/releases";
import { waitlistToken, type WaitlistLinkPurpose } from "@/lib/waitlist-links";

export interface LinkRelease {
  slug: string | null;
  title: string;
}

export function waitlistTokenUrl(path: string, entryId: string, purpose: WaitlistLinkPurpose): Promise<string> {
  return appUrl(`${path}?${new URLSearchParams({ token: waitlistToken(entryId, purpose) })}`);
}

export function waitlistConfirmUrl(entryId: string): Promise<string> {
  return waitlistTokenUrl(WAITLIST_CONFIRM_PAGE_PATH, entryId, "confirm");
}

/** The release page and the signed leave link that every waitlist email carries. */
export async function releaseLinks(release: LinkRelease, entryId: string) {
  const [url, leaveUrl] = await Promise.all([
    appUrl(release.slug ? releaseHref(release.slug) : RELEASES_PAGE_PATH),
    waitlistTokenUrl(WAITLIST_LEAVE_PAGE_PATH, entryId, "leave"),
  ]);
  return { title: release.title, url, leaveUrl };
}
