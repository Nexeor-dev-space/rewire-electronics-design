import { describe, expect, it } from "vitest";
import {
  COUPON_MESSAGES,
  COUPON_MINIMUM_TOKEN,
  couponStatus,
  evaluateCoupon,
  isLineEligible,
} from "@/lib/pricing/coupon";
import type { CouponContext, CouponRejection, CouponRule, PricingLine } from "@/lib/pricing/types";

const NOW = new Date("2026-06-01T12:00:00Z");
const EARLIER = new Date("2026-05-01T00:00:00Z");
const LATER = new Date("2026-07-01T00:00:00Z");

function line(overrides: Partial<PricingLine> = {}): PricingLine {
  return {
    key: "line-1",
    productId: "product-1",
    categoryIds: ["phones"],
    unitPrice: 100_00,
    addOnUnitPrice: 0,
    quantity: 1,
    purchasable: true,
    ...overrides,
  };
}

function rule(overrides: Partial<CouponRule> = {}): CouponRule {
  return {
    code: "SAVE10",
    type: "PERCENT",
    value: 10,
    minOrderAmount: 0,
    startsAt: null,
    endsAt: null,
    active: true,
    usageLimit: null,
    perCustomerLimit: null,
    redemptionCount: 0,
    appliesToAll: true,
    productIds: [],
    categoryIds: [],
    ...overrides,
  };
}

function context(overrides: Partial<CouponContext> = {}): CouponContext {
  const lines = overrides.lines ?? [line()];
  const subtotal = lines
    .filter((l) => l.purchasable)
    .reduce((sum, l) => sum + (l.unitPrice + l.addOnUnitPrice) * l.quantity, 0);
  return { lines, subtotal, customerRedemptions: 0, now: NOW, ...overrides };
}

describe("evaluateCoupon rules", () => {
  it("accepts a plain active coupon", () => {
    expect(evaluateCoupon(rule(), context())).toEqual({
      ok: true,
      discount: 10_00,
      eligibleSubtotal: 100_00,
    });
  });

  it.each<[CouponRejection, Partial<CouponRule>, Partial<CouponContext>]>([
    ["DISABLED", { active: false }, {}],
    ["NOT_STARTED", { startsAt: LATER }, {}],
    ["EXPIRED", { endsAt: EARLIER }, {}],
    ["USAGE_LIMIT_REACHED", { usageLimit: 5, redemptionCount: 6 }, {}],
    ["CUSTOMER_LIMIT_REACHED", { perCustomerLimit: 1 }, { customerRedemptions: 1 }],
    ["NOT_APPLICABLE", { appliesToAll: false, productIds: ["other"] }, {}],
    ["MINIMUM_NOT_MET", { minOrderAmount: 100_01 }, {}],
  ])("rejects with %s", (reason, ruleOverrides, contextOverrides) => {
    expect(evaluateCoupon(rule(ruleOverrides), context(contextOverrides))).toEqual({
      ok: false,
      reason,
    });
  });

  it("reports the first failing rule when several fail", () => {
    expect(evaluateCoupon(rule({ active: false, endsAt: EARLIER }), context())).toEqual({
      ok: false,
      reason: "DISABLED",
    });
    expect(
      evaluateCoupon(rule({ startsAt: LATER, usageLimit: 1, redemptionCount: 1 }), context()),
    ).toEqual({ ok: false, reason: "NOT_STARTED" });
    expect(
      evaluateCoupon(
        rule({ endsAt: EARLIER, usageLimit: 1, redemptionCount: 1 }),
        context(),
      ),
    ).toEqual({ ok: false, reason: "EXPIRED" });
    expect(
      evaluateCoupon(
        rule({ usageLimit: 1, redemptionCount: 1, perCustomerLimit: 1 }),
        context({ customerRedemptions: 1 }),
      ),
    ).toEqual({ ok: false, reason: "USAGE_LIMIT_REACHED" });
    expect(
      evaluateCoupon(
        rule({ perCustomerLimit: 1, appliesToAll: false }),
        context({ customerRedemptions: 1 }),
      ),
    ).toEqual({ ok: false, reason: "CUSTOMER_LIMIT_REACHED" });
    expect(
      evaluateCoupon(rule({ appliesToAll: false, minOrderAmount: 1_000_00 }), context()),
    ).toEqual({ ok: false, reason: "NOT_APPLICABLE" });
  });
});

describe("evaluateCoupon boundaries", () => {
  it("accepts a coupon at the exact start time", () => {
    expect(evaluateCoupon(rule({ startsAt: NOW }), context()).ok).toBe(true);
  });

  it("expires a coupon at the exact end time", () => {
    expect(evaluateCoupon(rule({ endsAt: NOW }), context())).toEqual({
      ok: false,
      reason: "EXPIRED",
    });
  });

  it("rejects when the redemption count equals the usage limit", () => {
    expect(evaluateCoupon(rule({ usageLimit: 3, redemptionCount: 3 }), context())).toEqual({
      ok: false,
      reason: "USAGE_LIMIT_REACHED",
    });
    expect(evaluateCoupon(rule({ usageLimit: 3, redemptionCount: 2 }), context()).ok).toBe(true);
  });

  it("accepts one customer redemption below the per customer limit", () => {
    expect(
      evaluateCoupon(rule({ perCustomerLimit: 2 }), context({ customerRedemptions: 1 })).ok,
    ).toBe(true);
  });

  it("accepts a subtotal equal to the minimum", () => {
    expect(evaluateCoupon(rule({ minOrderAmount: 100_00 }), context()).ok).toBe(true);
  });

  it("checks the minimum against the whole cart, not only eligible lines", () => {
    const lines = [
      line({ key: "a", productId: "eligible", unitPrice: 20_00 }),
      line({ key: "b", productId: "other", unitPrice: 80_00 }),
    ];
    expect(
      evaluateCoupon(
        rule({ appliesToAll: false, productIds: ["eligible"], minOrderAmount: 100_00 }),
        context({ lines }),
      ),
    ).toEqual({ ok: true, discount: 2_00, eligibleSubtotal: 20_00 });
  });

  it("rejects a cart with no lines as not applicable", () => {
    expect(evaluateCoupon(rule(), context({ lines: [] }))).toEqual({
      ok: false,
      reason: "NOT_APPLICABLE",
    });
  });
});

describe("evaluateCoupon amounts", () => {
  it("rounds a percent discount to the nearest minor unit", () => {
    const result = evaluateCoupon(rule({ value: 10 }), context({ lines: [line({ unitPrice: 33_33 })] }));
    expect(result).toEqual({ ok: true, discount: 3_33, eligibleSubtotal: 33_33 });
  });

  it("rounds half up on a percent discount", () => {
    const result = evaluateCoupon(rule({ value: 50 }), context({ lines: [line({ unitPrice: 1_01 })] }));
    expect(result).toEqual({ ok: true, discount: 51, eligibleSubtotal: 1_01 });
  });

  it("gives the whole eligible subtotal at 100 percent", () => {
    const result = evaluateCoupon(rule({ value: 100 }), context({ lines: [line({ unitPrice: 123_45 })] }));
    expect(result).toEqual({ ok: true, discount: 123_45, eligibleSubtotal: 123_45 });
  });

  it("never discounts more than the eligible subtotal on a bad percent value", () => {
    const result = evaluateCoupon(rule({ value: 150 }), context());
    expect(result).toEqual({ ok: true, discount: 100_00, eligibleSubtotal: 100_00 });
  });

  it("gives a fixed discount below the eligible subtotal in full", () => {
    const result = evaluateCoupon(rule({ type: "FIXED", value: 25_00 }), context());
    expect(result).toEqual({ ok: true, discount: 25_00, eligibleSubtotal: 100_00 });
  });

  it("caps a fixed discount larger than the eligible subtotal", () => {
    const lines = [
      line({ key: "a", productId: "eligible", unitPrice: 30_00 }),
      line({ key: "b", productId: "other", unitPrice: 500_00 }),
    ];
    const result = evaluateCoupon(
      rule({ type: "FIXED", value: 50_00, appliesToAll: false, productIds: ["eligible"] }),
      context({ lines }),
    );
    expect(result).toEqual({ ok: true, discount: 30_00, eligibleSubtotal: 30_00 });
  });

  it("includes add-ons and quantity in the eligible subtotal", () => {
    const result = evaluateCoupon(
      rule({ value: 10 }),
      context({ lines: [line({ unitPrice: 100_00, addOnUnitPrice: 20_00, quantity: 3 })] }),
    );
    expect(result).toEqual({ ok: true, discount: 36_00, eligibleSubtotal: 360_00 });
  });
});

describe("coupon restrictions", () => {
  const phone = line({ key: "phone", productId: "iphone", categoryIds: ["iphones", "phones"], unitPrice: 1000_00 });
  const laptop = line({ key: "laptop", productId: "macbook", categoryIds: ["laptops"], unitPrice: 2000_00 });

  it("limits a product restricted coupon to that product", () => {
    const result = evaluateCoupon(
      rule({ appliesToAll: false, productIds: ["macbook"] }),
      context({ lines: [phone, laptop] }),
    );
    expect(result).toEqual({ ok: true, discount: 200_00, eligibleSubtotal: 2000_00 });
  });

  it("limits a category restricted coupon to that category", () => {
    const result = evaluateCoupon(
      rule({ appliesToAll: false, categoryIds: ["iphones"] }),
      context({ lines: [phone, laptop] }),
    );
    expect(result).toEqual({ ok: true, discount: 100_00, eligibleSubtotal: 1000_00 });
  });

  it("lets a parent category cover its child categories", () => {
    const result = evaluateCoupon(
      rule({ appliesToAll: false, categoryIds: ["phones"] }),
      context({ lines: [phone, laptop] }),
    );
    expect(result).toEqual({ ok: true, discount: 100_00, eligibleSubtotal: 1000_00 });
  });

  it("combines product and category targets", () => {
    const result = evaluateCoupon(
      rule({ appliesToAll: false, productIds: ["macbook"], categoryIds: ["phones"] }),
      context({ lines: [phone, laptop] }),
    );
    expect(result).toEqual({ ok: true, discount: 300_00, eligibleSubtotal: 3000_00 });
  });

  it("ignores an unpurchasable eligible line", () => {
    const result = evaluateCoupon(
      rule({ appliesToAll: false, productIds: ["iphone"] }),
      context({ lines: [{ ...phone, purchasable: false }, laptop] }),
    );
    expect(result).toEqual({ ok: false, reason: "NOT_APPLICABLE" });
  });

  it("leaves an unpurchasable line out of a store wide eligible subtotal", () => {
    const result = evaluateCoupon(rule(), context({ lines: [{ ...phone, purchasable: false }, laptop] }));
    expect(result).toEqual({ ok: true, discount: 200_00, eligibleSubtotal: 2000_00 });
  });
});

describe("isLineEligible", () => {
  it("accepts every line when the coupon applies to all", () => {
    expect(isLineEligible(rule({ productIds: ["x"] }), line())).toBe(true);
  });

  it("rejects every line for a restricted coupon with no targets", () => {
    expect(isLineEligible(rule({ appliesToAll: false }), line())).toBe(false);
  });

  it("matches on product id or any shared category id", () => {
    const restricted = rule({ appliesToAll: false, productIds: ["product-1"], categoryIds: ["tablets"] });
    expect(isLineEligible(restricted, line())).toBe(true);
    expect(isLineEligible(restricted, line({ productId: "p2", categoryIds: ["tablets"] }))).toBe(true);
    expect(isLineEligible(restricted, line({ productId: "p2", categoryIds: ["phones"] }))).toBe(false);
  });
});

describe("couponStatus", () => {
  it.each([
    ["ACTIVE", {}],
    ["DISABLED", { active: false, endsAt: EARLIER }],
    ["SCHEDULED", { startsAt: LATER }],
    ["EXPIRED", { endsAt: NOW }],
    ["USED_UP", { usageLimit: 2, redemptionCount: 2 }],
  ] as const)("reports %s", (status, overrides) => {
    expect(couponStatus(rule(overrides), NOW)).toBe(status);
  });

  it("is ACTIVE inside its window with redemptions left", () => {
    expect(
      couponStatus(rule({ startsAt: EARLIER, endsAt: LATER, usageLimit: 2, redemptionCount: 1 }), NOW),
    ).toBe("ACTIVE");
  });
});

describe("COUPON_MESSAGES", () => {
  it("does not tell a disabled code apart from an unknown one", () => {
    expect(COUPON_MESSAGES.DISABLED).toBe(COUPON_MESSAGES.INVALID);
  });

  it("carries the minimum placeholder for the service to fill", () => {
    expect(COUPON_MESSAGES.MINIMUM_NOT_MET).toContain(COUPON_MINIMUM_TOKEN);
  });
});
