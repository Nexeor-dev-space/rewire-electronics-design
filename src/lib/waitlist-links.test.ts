import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WAITLIST_CONFIRM_LINK_TTL_SECONDS, WAITLIST_LEAVE_LINK_TTL_SECONDS } from "./constants";
import { readWaitlistToken, waitlistToken } from "./waitlist-links";

const SECRET = "s".repeat(32) + "-test-secret-for-waitlist-links";
const NOW = new Date("2026-11-03T10:00:00Z");
const MS_PER_SECOND = 1000;

function secondsLater(seconds: number): Date {
  return new Date(NOW.getTime() + seconds * MS_PER_SECOND);
}

describe("waitlist links", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("round trips a confirm link", () => {
    expect(readWaitlistToken(waitlistToken("entry1", "confirm", NOW), "confirm", NOW)).toBe("entry1");
  });

  it("refuses a link used for the other purpose", () => {
    expect(readWaitlistToken(waitlistToken("entry1", "leave", NOW), "confirm", NOW)).toBeNull();
    expect(readWaitlistToken(waitlistToken("entry1", "confirm", NOW), "leave", NOW)).toBeNull();
  });

  it("keeps a confirm link until its expiry and refuses it after", () => {
    const token = waitlistToken("entry1", "confirm", NOW);
    expect(readWaitlistToken(token, "confirm", secondsLater(WAITLIST_CONFIRM_LINK_TTL_SECONDS - 1))).toBe("entry1");
    expect(readWaitlistToken(token, "confirm", secondsLater(WAITLIST_CONFIRM_LINK_TTL_SECONDS))).toBeNull();
  });

  it("keeps a leave link valid far longer than a confirm link", () => {
    const later = secondsLater(WAITLIST_CONFIRM_LINK_TTL_SECONDS + 1);
    expect(readWaitlistToken(waitlistToken("entry1", "leave", NOW), "leave", later)).toBe("entry1");
    expect(readWaitlistToken(waitlistToken("entry1", "leave", NOW), "leave", secondsLater(WAITLIST_LEAVE_LINK_TTL_SECONDS))).toBeNull();
  });

  it("refuses a tampered or malformed link", () => {
    const token = waitlistToken("entry1", "confirm", NOW).replace("entry1", "entry2");
    expect(readWaitlistToken(token, "confirm", NOW)).toBeNull();
    expect(readWaitlistToken("garbage", "confirm", NOW)).toBeNull();
  });

  it("refuses a link signed with another secret", () => {
    const token = waitlistToken("entry1", "confirm", NOW);
    process.env.AUTH_SECRET = "o".repeat(40);
    expect(readWaitlistToken(token, "confirm", NOW)).toBeNull();
  });
});
