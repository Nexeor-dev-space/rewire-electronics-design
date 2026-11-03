import { describe, expect, it } from "vitest";
import { releaseStatus } from "@/lib/releases";

const NOW = new Date("2026-11-02T10:00:00Z");
const window = (startsAt: string, endsAt: string | null, active = true) => ({
  active,
  startsAt: new Date(startsAt),
  endsAt: endsAt ? new Date(endsAt) : null,
});

describe("releaseStatus", () => {
  it("is live once started and before its end", () => {
    expect(releaseStatus(window("2026-11-01T14:00:00Z", "2026-11-08T14:00:00Z"), NOW)).toBe("LIVE");
  });

  it("is live with no end date", () => {
    expect(releaseStatus(window("2026-11-01T14:00:00Z", null), NOW)).toBe("LIVE");
  });

  it("is upcoming before its start", () => {
    expect(releaseStatus(window("2026-11-15T14:00:00Z", null), NOW)).toBe("UPCOMING");
  });

  it("is ended from its end time on", () => {
    expect(releaseStatus(window("2026-10-20T14:00:00Z", "2026-11-02T10:00:00Z"), NOW)).toBe("ENDED");
  });

  it("is off when inactive, whatever the dates", () => {
    expect(releaseStatus(window("2026-11-01T14:00:00Z", null, false), NOW)).toBe("OFF");
  });
});
