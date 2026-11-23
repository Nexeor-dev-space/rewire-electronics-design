import { describe, expect, it } from "vitest";
import { RELEASE_REMINDER_DEFAULTS_MINUTES, RELEASE_TEST_REMINDER_DEFAULTS_MINUTES } from "@/lib/constants";
import {
  allowedEdits,
  canChangeState,
  canDeleteRelease,
  canDropAllocation,
  defaultReminderOffsets,
  endedWindow,
  publishBlocker,
  releaseStatus,
  reminderLabel,
  reminderRowMinutes,
  remindersSummary,
  testEmailsSummary,
  toReminderRow,
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

  it("locks the opening time and the reminders once open", () => {
    for (const status of ["LIVE", "SOLD_OUT"] as const) {
      expect(allowedEdits(status)).toEqual({
        text: true,
        hidden: true,
        maxPerCustomer: true,
        startsAt: false,
        endsAt: true,
        allocations: true,
        reminders: false,
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
      reminders: false,
    });
  });

  it("lets reminders change only before opening", () => {
    expect(allowedEdits("DRAFT").reminders).toBe(true);
    expect(allowedEdits("UPCOMING").reminders).toBe(true);
  });
});

describe("defaultReminderOffsets", () => {
  it("uses the store defaults, and the short ones in test mode", () => {
    expect(defaultReminderOffsets(false)).toEqual(RELEASE_REMINDER_DEFAULTS_MINUTES);
    expect(defaultReminderOffsets(true)).toEqual(RELEASE_TEST_REMINDER_DEFAULTS_MINUTES);
  });

  it("returns a copy, so a caller can't change the defaults", () => {
    defaultReminderOffsets(false).push(1);
    expect(defaultReminderOffsets(false)).toEqual(RELEASE_REMINDER_DEFAULTS_MINUTES);
  });
});

describe("the reminders field", () => {
  it("shows saved minutes in the largest unit that fits exactly", () => {
    expect(toReminderRow(2880)).toEqual({ amount: "2", unit: "DAYS" });
    expect(toReminderRow(60)).toEqual({ amount: "1", unit: "HOURS" });
    expect(toReminderRow(90)).toEqual({ amount: "90", unit: "MINUTES" });
    expect(toReminderRow(10)).toEqual({ amount: "10", unit: "MINUTES" });
  });

  it("turns a row back into minutes", () => {
    expect(reminderRowMinutes({ amount: "2", unit: "DAYS" })).toBe(2880);
    expect(reminderRowMinutes({ amount: " 3 ", unit: "HOURS" })).toBe(180);
    expect(reminderRowMinutes({ amount: "45", unit: "MINUTES" })).toBe(45);
    expect([2880, 60, 90].map((minutes) => reminderRowMinutes(toReminderRow(minutes)))).toEqual([2880, 60, 90]);
  });

  it("keeps an empty, fractional or worded amount as not a number, so validation can reject it", () => {
    expect(reminderRowMinutes({ amount: "", unit: "HOURS" })).toBeNaN();
    expect(reminderRowMinutes({ amount: "1.5", unit: "HOURS" })).toBeNaN();
    expect(reminderRowMinutes({ amount: "soon", unit: "DAYS" })).toBeNaN();
  });

  it("names a reminder time exactly, in days, hours or minutes", () => {
    expect(reminderLabel(2880)).toBe("2 days");
    expect(reminderLabel(1440)).toBe("1 day");
    expect(reminderLabel(60)).toBe("1 hour");
    expect(reminderLabel(90)).toBe("90 minutes");
    expect(reminderLabel(10)).toBe("10 minutes");
  });

  it("reads the list back in words, largest first", () => {
    expect(remindersSummary([60, 2880])).toBe("Sends 2 days and 1 hour before opening.");
    expect(remindersSummary([5])).toBe("Sends 5 minutes before opening.");
    expect(remindersSummary([])).toBe("No reminders will be sent.");
  });
});

describe("testEmailsSummary", () => {
  const none = { recipient: "admin@rewire.ae", sent: 0, logged: 0, failed: 0 };

  it("says how many were sent and to whom", () => {
    expect(testEmailsSummary({ ...none, sent: 5 })).toBe("Sent 5 test emails to admin@rewire.ae.");
  });

  it("says when they only reached the server log", () => {
    expect(testEmailsSummary({ ...none, logged: 5 })).toBe(
      "Email isn't set up on this server, so 5 test emails for admin@rewire.ae were printed to the server log.",
    );
  });

  it("adds the failures after what was sent", () => {
    expect(testEmailsSummary({ ...none, sent: 4, failed: 1 })).toBe(
      "Sent 4 test emails to admin@rewire.ae. 1 test email failed.",
    );
  });

  it("says so when nothing went out", () => {
    expect(testEmailsSummary(none)).toBe("No test emails were sent.");
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
