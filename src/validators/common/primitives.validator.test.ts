import { describe, expect, it } from "vitest";
import { uaePhoneValidator } from "./primitives.validator";

describe("uaePhoneValidator", () => {
  it("accepts mobile numbers with 050 prefix", () => {
    const result = uaePhoneValidator.parse("050 123 4567");
    expect(result).toBe("+971501234567");
  });

  it("accepts mobile numbers with +971 prefix", () => {
    const result = uaePhoneValidator.parse("+971 50 123 4567");
    expect(result).toBe("+971501234567");
  });

  it("accepts mobile numbers with 00971 prefix", () => {
    const result = uaePhoneValidator.parse("00971501234567");
    expect(result).toBe("+971501234567");
  });

  it("accepts mobile numbers with 971 prefix", () => {
    const result = uaePhoneValidator.parse("971501234567");
    expect(result).toBe("+971501234567");
  });

  it("accepts landline numbers with 04 prefix", () => {
    const result = uaePhoneValidator.parse("04 123 4567");
    expect(result).toBe("+97141234567");
  });

  it("accepts landline numbers with other area codes", () => {
    expect(uaePhoneValidator.parse("02 234 5678")).toBe("+97122345678");
    expect(uaePhoneValidator.parse("03 234 5678")).toBe("+97132345678");
    expect(uaePhoneValidator.parse("06 234 5678")).toBe("+97162345678");
    expect(uaePhoneValidator.parse("07 234 5678")).toBe("+97172345678");
    expect(uaePhoneValidator.parse("09 234 5678")).toBe("+97192345678");
  });

  it("accepts different mobile prefixes", () => {
    expect(uaePhoneValidator.parse("050 123 4567")).toBe("+971501234567");
    expect(uaePhoneValidator.parse("052 123 4567")).toBe("+971521234567");
    expect(uaePhoneValidator.parse("054 123 4567")).toBe("+971541234567");
    expect(uaePhoneValidator.parse("055 123 4567")).toBe("+971551234567");
    expect(uaePhoneValidator.parse("056 123 4567")).toBe("+971561234567");
  });

  it("strips spaces, dashes, dots and parentheses", () => {
    expect(uaePhoneValidator.parse("050-123-4567")).toBe("+971501234567");
    expect(uaePhoneValidator.parse("050.123.4567")).toBe("+971501234567");
    expect(uaePhoneValidator.parse("(050) 123 4567")).toBe("+971501234567");
    expect(uaePhoneValidator.parse("+971(50)123-4567")).toBe("+971501234567");
  });

  it("rejects numbers with insufficient digits", () => {
    const result = uaePhoneValidator.safeParse("050 123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid UAE phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects numbers without a valid prefix", () => {
    const result = uaePhoneValidator.safeParse("1234567");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid UAE phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects numbers with invalid digit patterns", () => {
    const result = uaePhoneValidator.safeParse("+971 00 000 0000");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid UAE phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects non-numeric input", () => {
    const result = uaePhoneValidator.safeParse("abc");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid UAE phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects empty string with the empty error message", () => {
    const result = uaePhoneValidator.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a phone number.");
    }
  });

  it("rejects string with only spaces", () => {
    const result = uaePhoneValidator.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a phone number.");
    }
  });
});
