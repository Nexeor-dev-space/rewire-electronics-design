import { describe, expect, it } from "vitest";
import {
  allowedEdits,
  canChangeState,
  canDeleteRelease,
  canDropAllocation,
  endedWindow,
  publishBlocker,
  releaseStatus,
} from "@/lib/releases";

const NOW = new Date("2026-11-02T10:00:00Z");
const PAST = new Date("2026-11-01T10:00:00Z");
const FUTURE = new Date("2026-11-05T10:00:00Z");
const LATER = new Date("2026-11-08T10:00:00Z");

const published = { publishedAt: PAST, completedAt: null, startsAt: PAST, endsAt: LATER };

describe("releaseStatus", () => {
  it("is draft without a publish date, whatever the dates", () => {
    expect(releaseStatus({ ...published, publishedAt: null }, 5, NOW)).toBe("DRAFT");
    expect(releaseStatus({ ...published, publishedAt: null, endsAt: PAST }, 0, NOW)).toBe("DRAFT");
  });

  it("is completed once completedAt is set or the end has passed", () => {
    expect(releaseStatus({ ...published, completedAt: NOW }, 5, NOW)).toBe("COMPLETED");
    expect(releaseStatus({ ...published, endsAt: NOW }, 5, NOW)).toBe("COMPLETED");
  });

  it("is upcoming before opening", () => {
    expect(releaseStatus({ ...published, startsAt: FUTURE }, 5, NOW)).toBe("UPCOMING");
  });

  it("is sold out when open with nothing available, and live otherwise", () => {
    expect(releaseStatus(published, 0, NOW)).toBe("SOLD_OUT");
    expect(releaseStatus(published, 3, NOW)).toBe("LIVE");
    expect(releaseStatus({ ...published, endsAt: null }, 3, NOW)).toBe("LIVE");
  });
});

describe("allowedEdits", () => {
  it("allows everything for draft and upcoming", () => {
    for (const status of ["DRAFT", "UPCOMING"] as const) {
      expect(Object.values(allowedEdits(status)).every(Boolean)).toBe(true);
    }
  });

  it("locks the opening time once open", () => {
    for (const status of ["LIVE", "SOLD_OUT"] as const) {
      expect(allowedEdits(status)).toEqual({
        text: true,
        hidden: true,
        maxPerCustomer: true,
        startsAt: false,
        endsAt: true,
        allocations: true,
      });
    }
  });

  it("allows only text and hidden when completed", () => {
    expect(allowedEdits("COMPLETED")).toEqual({
      text: true,
      hidden: true,
      maxPerCustomer: false,
      startsAt: false,
      endsAt: false,
      allocations: false,
    });
  });
});

describe("state changes and delete", () => {
  it("publishes drafts, unpublishes upcoming, ends upcoming live and sold out", () => {
    expect(canChangeState("DRAFT", "PUBLISH")).toBe(true);
    expect(canChangeState("UPCOMING", "PUBLISH")).toBe(false);
    expect(canChangeState("UPCOMING", "UNPUBLISH")).toBe(true);
    expect(canChangeState("LIVE", "UNPUBLISH")).toBe(false);
    expect(canChangeState("SOLD_OUT", "END")).toBe(true);
    expect(canChangeState("COMPLETED", "END")).toBe(false);
  });

  it("deletes only draft and upcoming", () => {
    expect(canDeleteRelease("DRAFT")).toBe(true);
    expect(canDeleteRelease("UPCOMING")).toBe(true);
    expect(canDeleteRelease("LIVE")).toBe(false);
    expect(canDeleteRelease("COMPLETED")).toBe(false);
  });
});

describe("canDropAllocation", () => {
  const empty = { allocated: 0, reserved: 0, sold: 0, returned: 0 };
  const draft = { ...published, publishedAt: null };
  const completed = { ...published, endsAt: PAST, startsAt: new Date("2026-10-01T10:00:00Z") };

  it("drops a zero unit row on any release", () => {
    expect(canDropAllocation(empty, draft, NOW)).toBe(true);
    expect(canDropAllocation(empty, published, NOW)).toBe(true);
  });

  it("drops unsold units of a completed release", () => {
    expect(canDropAllocation({ ...empty, allocated: 4 }, completed, NOW)).toBe(true);
  });

  it("keeps a row with held, sold or returned units", () => {
    expect(canDropAllocation({ ...empty, allocated: 4, sold: 1 }, completed, NOW)).toBe(false);
    expect(canDropAllocation({ ...empty, allocated: 4, reserved: 1 }, completed, NOW)).toBe(false);
    expect(canDropAllocation({ ...empty, allocated: 4, returned: 1 }, completed, NOW)).toBe(false);
  });

  it("keeps units on a release that hasn't completed", () => {
    expect(canDropAllocation({ ...empty, allocated: 4 }, published, NOW)).toBe(false);
    expect(canDropAllocation({ ...empty, allocated: 4 }, draft, NOW)).toBe(false);
  });
});

describe("publishBlocker", () => {
  const ready = { startsAt: FUTURE, endsAt: LATER, maxPerCustomer: 1, totalAllocated: 3 };

  it("passes a release with units, a future end after opening and a cap", () => {
    expect(publishBlocker(ready, NOW)).toBeNull();
  });

  it.each([
    ["no units", { totalAllocated: 0 }],
    ["no end", { endsAt: null }],
    ["an end before opening", { endsAt: PAST }],
    ["an end in the past", { startsAt: new Date("2026-10-01T10:00:00Z"), endsAt: PAST }],
    ["a zero cap", { maxPerCustomer: 0 }],
  ])("blocks %s", (_label, override) => {
    expect(publishBlocker({ ...ready, ...override }, NOW)).not.toBeNull();
  });
});

describe("endedWindow", () => {
  it("ends now and keeps a past opening", () => {
    expect(endedWindow(PAST, NOW)).toEqual({ startsAt: PAST, endsAt: NOW });
  });

  it("moves a future opening to just before now so the end stays after it", () => {
    const window = endedWindow(FUTURE, NOW);
    expect(window.endsAt).toEqual(NOW);
    expect(window.startsAt.getTime()).toBeLessThan(NOW.getTime());
  });
});
