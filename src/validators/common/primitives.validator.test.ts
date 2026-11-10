import { describe, expect, it } from "vitest";
import { optionalPhoneValidator, phoneValidator } from "./primitives.validator";

describe("phoneValidator", () => {
  it("accepts mobile numbers with 050 prefix", () => {
    const result = phoneValidator.parse("050 123 4567");
    expect(result).toBe("+971501234567");
  });

  it("accepts mobile numbers with +971 prefix", () => {
    const result = phoneValidator.parse("+971 50 123 4567");
    expect(result).toBe("+971501234567");
  });

  it("accepts mobile numbers with 00971 prefix", () => {
    const result = phoneValidator.parse("00971501234567");
    expect(result).toBe("+971501234567");
  });

  it("accepts mobile numbers with 971 prefix", () => {
    const result = phoneValidator.parse("971501234567");
    expect(result).toBe("+971501234567");
  });

  it("accepts landline numbers with 04 prefix", () => {
    const result = phoneValidator.parse("04 123 4567");
    expect(result).toBe("+97141234567");
  });

  it("accepts landline numbers with other area codes", () => {
    expect(phoneValidator.parse("02 234 5678")).toBe("+97122345678");
    expect(phoneValidator.parse("03 234 5678")).toBe("+97132345678");
    expect(phoneValidator.parse("06 234 5678")).toBe("+97162345678");
    expect(phoneValidator.parse("07 234 5678")).toBe("+97172345678");
    expect(phoneValidator.parse("09 234 5678")).toBe("+97192345678");
  });

  it("accepts different mobile prefixes", () => {
    expect(phoneValidator.parse("050 123 4567")).toBe("+971501234567");
    expect(phoneValidator.parse("052 123 4567")).toBe("+971521234567");
    expect(phoneValidator.parse("054 123 4567")).toBe("+971541234567");
    expect(phoneValidator.parse("055 123 4567")).toBe("+971551234567");
    expect(phoneValidator.parse("056 123 4567")).toBe("+971561234567");
  });

  it("strips spaces, dashes, dots and parentheses", () => {
    expect(phoneValidator.parse("050-123-4567")).toBe("+971501234567");
    expect(phoneValidator.parse("050.123.4567")).toBe("+971501234567");
    expect(phoneValidator.parse("(050) 123 4567")).toBe("+971501234567");
    expect(phoneValidator.parse("+971(50)123-4567")).toBe("+971501234567");
  });

  it("rejects numbers with insufficient digits", () => {
    const result = phoneValidator.safeParse("050 123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid UAE phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects numbers without a valid prefix", () => {
    const result = phoneValidator.safeParse("1234567");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid UAE phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects numbers with invalid digit patterns", () => {
    const result = phoneValidator.safeParse("+971 00 000 0000");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid UAE phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects non-numeric input", () => {
    const result = phoneValidator.safeParse("abc");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid UAE phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects empty string with the empty error message", () => {
    const result = phoneValidator.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a phone number.");
    }
  });

  it("rejects string with only spaces", () => {
    const result = phoneValidator.safeParse("   ");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a phone number.");
    }
  });

  it("normalizes Saudi mobile numbers", () => {
    expect(phoneValidator.parse("+966 50 123 4567")).toBe("+966501234567");
    expect(phoneValidator.parse("00966501234567")).toBe("+966501234567");
  });

  it("rejects an incomplete Saudi number with the Saudi message", () => {
    const result = phoneValidator.safeParse("+966 50 123");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Enter a valid Saudi phone number, e.g. 050 123 4567.");
    }
  });

  it("rejects a doubled country code", () => {
    expect(phoneValidator.safeParse("+971 +971 50 123 4567").success).toBe(false);
    expect(phoneValidator.safeParse("+971 971 50 123 4567").success).toBe(false);
  });
});

describe("optionalPhoneValidator", () => {
  it("turns a blank value into null", () => {
    expect(optionalPhoneValidator.parse("  ")).toBeNull();
    expect(optionalPhoneValidator.parse(undefined)).toBeNull();
  });

  it("stores the normalized number", () => {
    expect(optionalPhoneValidator.parse(" +971 50 123 4567 ")).toBe("+971501234567");
  });

  it("applies the same rules as a required phone", () => {
    expect(optionalPhoneValidator.safeParse("1234567").success).toBe(false);
    expect(optionalPhoneValidator.safeParse("+971 971 50 123 4567").success).toBe(false);
  });

  it("refuses another country's number with a message saying so", () => {
    const result = optionalPhoneValidator.safeParse("+44 7911 123456");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Only UAE (+971) and Saudi (+966) numbers are accepted.");
    }
  });
});
