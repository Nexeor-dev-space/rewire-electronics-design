import { describe, expect, it } from "vitest";
import { startOfStoreDay } from "@/lib/dates";

describe("startOfStoreDay", () => {
  it("returns midnight in Dubai as a UTC instant", () => {
    expect(startOfStoreDay(new Date("2026-11-02T10:00:00Z")).toISOString()).toBe("2026-11-01T20:00:00.000Z");
  });

  it("rolls to the next store day once Dubai passes midnight", () => {
    expect(startOfStoreDay(new Date("2026-11-02T19:59:59Z")).toISOString()).toBe("2026-11-01T20:00:00.000Z");
    expect(startOfStoreDay(new Date("2026-11-02T20:00:00Z")).toISOString()).toBe("2026-11-02T20:00:00.000Z");
  });
});
