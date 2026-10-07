import { describe, expect, it } from "vitest";
import { ORDER_NUMBER_PREFIX, REFERENCE_NUMBER_DIGITS } from "@/lib/constants";
import { formatReference, generateReference } from "./reference-number";

const ORDER_NUMBER = new RegExp(`^${ORDER_NUMBER_PREFIX}\\d{${REFERENCE_NUMBER_DIGITS}}$`);

describe("formatReference", () => {
  it("pads the number to the fixed width", () => {
    expect(formatReference("RW-", 42)).toBe("RW-00000042");
  });

  it("keeps a number that already fills the width", () => {
    expect(formatReference("RW-", 12345678)).toBe("RW-12345678");
  });
});

describe("generateReference", () => {
  it("returns the prefix and the fixed number of digits", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(generateReference(ORDER_NUMBER_PREFIX)).toMatch(ORDER_NUMBER);
    }
  });
});
