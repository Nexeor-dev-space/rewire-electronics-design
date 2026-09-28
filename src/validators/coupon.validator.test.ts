import { describe, expect, it } from "vitest";
import { couponListQuerySchema, couponSchema } from "./coupon.validator";

const base = { code: "save10", type: "PERCENT", value: 10 };

function fieldErrors(input: unknown) {
  const result = couponSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
}

describe("couponSchema", () => {
  it("trims and uppercases the code and fills defaults", () => {
    const result = couponSchema.parse({ ...base, code: "  save10 " });
    expect(result).toMatchObject({
      code: "SAVE10",
      description: "",
      minOrderAmount: 0,
      startsAt: null,
      endsAt: null,
      active: true,
      usageLimit: null,
      perCustomerLimit: null,
      appliesToAll: true,
      productIds: [],
      categoryIds: [],
    });
  });

  it("rejects codes that are too short, too long or have other characters", () => {
    expect(fieldErrors({ ...base, code: "ab" })).toHaveProperty("code");
    expect(fieldErrors({ ...base, code: "A".repeat(33) })).toHaveProperty("code");
    expect(fieldErrors({ ...base, code: "SAVE 10" })).toHaveProperty("code");
    expect(fieldErrors({ ...base, code: "SAVE-10_OFF" })).toEqual({});
  });

  it("accepts percent 1 to 100 and rejects 0, 101 and fractions", () => {
    expect(fieldErrors({ ...base, value: 1 })).toEqual({});
    expect(fieldErrors({ ...base, value: 100 })).toEqual({});
    expect(fieldErrors({ ...base, value: 0 })).toHaveProperty("value");
    expect(fieldErrors({ ...base, value: 101 })).toHaveProperty("value");
    expect(fieldErrors({ ...base, value: 10.5 })).toHaveProperty("value");
  });

  it("allows a fixed amount above 100 minor units but not a fraction", () => {
    expect(fieldErrors({ ...base, type: "FIXED", value: 50_00 })).toEqual({});
    expect(fieldErrors({ ...base, type: "FIXED", value: 12.5 })).toHaveProperty("value");
  });

  it("rejects a negative or fractional minimum", () => {
    expect(fieldErrors({ ...base, minOrderAmount: -1 })).toHaveProperty("minOrderAmount");
    expect(fieldErrors({ ...base, minOrderAmount: 1.5 })).toHaveProperty("minOrderAmount");
  });

  it("requires the end to be after the start", () => {
    const startsAt = "2026-10-01T00:00:00Z";
    expect(fieldErrors({ ...base, startsAt, endsAt: "2026-10-02T00:00:00Z" })).toEqual({});
    expect(fieldErrors({ ...base, startsAt, endsAt: startsAt })).toHaveProperty("endsAt");
    expect(fieldErrors({ ...base, startsAt, endsAt: "2026-09-30T00:00:00Z" })).toHaveProperty("endsAt");
    expect(fieldErrors({ ...base, endsAt: "2026-09-30T00:00:00Z" })).toEqual({});
  });

  it("rejects dates that are not ISO date-times", () => {
    expect(fieldErrors({ ...base, startsAt: "tomorrow" })).toHaveProperty("startsAt");
  });

  it("rejects usage limits below 1", () => {
    expect(fieldErrors({ ...base, usageLimit: 0 })).toHaveProperty("usageLimit");
    expect(fieldErrors({ ...base, perCustomerLimit: 0 })).toHaveProperty("perCustomerLimit");
  });

  it("needs a product or category when not applied to every product", () => {
    expect(fieldErrors({ ...base, appliesToAll: false })).toHaveProperty("productIds");
    expect(fieldErrors({ ...base, appliesToAll: false, productIds: ["p1"] })).toEqual({});
    expect(fieldErrors({ ...base, appliesToAll: false, categoryIds: ["c1"] })).toEqual({});
  });

  it("caps the number of targets", () => {
    const productIds = Array.from({ length: 51 }, (_, index) => `p${index}`);
    expect(fieldErrors({ ...base, appliesToAll: false, productIds })).toHaveProperty("productIds");
  });
});

describe("couponListQuerySchema", () => {
  it("turns the active flag into a boolean", () => {
    expect(couponListQuerySchema.parse({ active: "false" }).active).toBe(false);
    expect(couponListQuerySchema.parse({}).active).toBeUndefined();
  });

  it("bounds the page size", () => {
    expect(couponListQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
  });
});
