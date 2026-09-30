import { describe, expect, it } from "vitest";
import { formatEta } from "./delivery";

describe("formatEta", () => {
  it("formats a range", () => {
    expect(formatEta(2, 4)).toBe("2 to 4 working days");
  });

  it("says next working day when both are 1", () => {
    expect(formatEta(1, 1)).toBe("Next working day");
  });

  it("collapses an equal range", () => {
    expect(formatEta(3, 3)).toBe("3 working days");
  });

  it("says same working day when the latest is 0", () => {
    expect(formatEta(0, 0)).toBe("Same working day");
  });
});
