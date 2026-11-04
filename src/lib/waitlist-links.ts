import { signed, verifySigned } from "@/lib/auth/sign";
import { WAITLIST_CONFIRM_LINK_TTL_SECONDS, WAITLIST_LEAVE_LINK_TTL_SECONDS } from "@/lib/constants";

export type WaitlistLinkPurpose = "confirm" | "leave";

const VERSION = "w1";
const SEPARATOR = ".";
const MS_PER_SECOND = 1000;

const TTL_SECONDS: Record<WaitlistLinkPurpose, number> = {
  confirm: WAITLIST_CONFIRM_LINK_TTL_SECONDS,
  leave: WAITLIST_LEAVE_LINK_TTL_SECONDS,
};

export function waitlistToken(entryId: string, purpose: WaitlistLinkPurpose, now: Date = new Date()): string {
  const expiresAt = Math.floor(now.getTime() / MS_PER_SECOND) + TTL_SECONDS[purpose];
  return signed([VERSION, purpose, entryId, expiresAt].join(SEPARATOR));
}

export function readWaitlistToken(
  token: string,
  purpose: WaitlistLinkPurpose,
  now: Date = new Date(),
): string | null {
  const payload = verifySigned(token);
  if (!payload) return null;
  const [version, claimed, entryId, expires, ...rest] = payload.split(SEPARATOR);
  if (version !== VERSION || claimed !== purpose || !entryId || rest.length > 0) return null;
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt * MS_PER_SECOND <= now.getTime()) return null;
  return entryId;
}
