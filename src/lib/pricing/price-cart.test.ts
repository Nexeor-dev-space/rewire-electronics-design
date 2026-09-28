import { describe, expect, it } from "vitest";
import { VAT_RATE_PERCENT } from "@/lib/constants";
import { priceCart, vatIncludedIn } from "@/lib/pricing/price-cart";
import type { CouponRule, PriceCartInput, PricingLine } from "@/lib/pricing/types";

const NOW = new Date("2026-06-01T12:00:00Z");

function line(overrides: Partial<PricingLine> = {}): PricingLine {
  return {
    key: "line-1",
    productId: "product-1",
    categoryIds: ["category-1"],
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

function input(overrides: Partial<PriceCartInput> = {}): PriceCartInput {
  return { lines: [], coupon: null, deliveryFee: null, now: NOW, ...overrides };
}

describe("priceCart", () => {
  it("prices an empty cart at zero with no delivery", () => {
    expect(priceCart(input())).toEqual({
      lines: [],
      subtotal: 0,
      discount: 0,
      delivery: null,
      total: 0,
      vatIncluded: 0,
      vatRatePercent: VAT_RATE_PERCENT,
      coupon: null,
    });
  });

  it("charges add-ons per unit", () => {
    const result = priceCart(
      input({ lines: [line({ unitPrice: 1000_00, addOnUnitPrice: 150_00, quantity: 2 })] }),
    );
    expect(result.lines).toEqual([{ key: "line-1", lineTotal: 2300_00 }]);
    expect(result.subtotal).toBe(2300_00);
    expect(result.total).toBe(2300_00);
  });

  it("shows an unpurchasable line but leaves it out of the subtotal", () => {
    const result = priceCart(
      input({
        lines: [
          line({ key: "a", unitPrice: 200_00 }),
          line({ key: "b", unitPrice: 300_00, quantity: 2, purchasable: false }),
        ],
      }),
    );
    expect(result.lines).toEqual([
      { key: "a", lineTotal: 200_00 },
      { key: "b", lineTotal: 600_00 },
    ]);
    expect(result.subtotal).toBe(200_00);
    expect(result.total).toBe(200_00);
  });

  it("adds the delivery fee to the total", () => {
    const result = priceCart(input({ lines: [line()], deliveryFee: 35_00 }));
    expect(result.delivery).toBe(35_00);
    expect(result.total).toBe(135_00);
  });

  it("charges no delivery on a zero subtotal cart", () => {
    const result = priceCart(
      input({ lines: [line({ purchasable: false })], deliveryFee: 35_00 }),
    );
    expect(result.delivery).toBe(0);
    expect(result.total).toBe(0);
  });

  it("keeps delivery null until a fee is quoted", () => {
    expect(priceCart(input({ lines: [line()] })).delivery).toBeNull();
  });

  it("takes the discount before adding delivery", () => {
    const result = priceCart(
      input({
        lines: [line({ unitPrice: 500_00 })],
        coupon: { rule: rule({ value: 10 }), customerRedemptions: 0 },
        deliveryFee: 35_00,
      }),
    );
    expect(result.subtotal).toBe(500_00);
    expect(result.discount).toBe(50_00);
    expect(result.total).toBe(500_00 - 50_00 + 35_00);
    expect(result.coupon).toEqual({ ok: true, discount: 50_00, eligibleSubtotal: 500_00 });
  });

  it("applies no discount when the coupon is rejected", () => {
    const result = priceCart(
      input({
        lines: [line()],
        coupon: { rule: rule({ active: false }), customerRedemptions: 0 },
      }),
    );
    expect(result.discount).toBe(0);
    expect(result.total).toBe(100_00);
    expect(result.coupon).toEqual({ ok: false, reason: "DISABLED" });
  });

  it("caps a fixed discount at the eligible subtotal", () => {
    const result = priceCart(
      input({
        lines: [line({ unitPrice: 40_00 })],
        coupon: { rule: rule({ type: "FIXED", value: 100_00 }), customerRedemptions: 0 },
        deliveryFee: 35_00,
      }),
    );
    expect(result.discount).toBe(40_00);
    expect(result.total).toBe(35_00);
  });

  it("works out VAT from inside the total, including delivery", () => {
    const result = priceCart(input({ lines: [line({ unitPrice: 70_00 })], deliveryFee: 35_00 }));
    expect(result.total).toBe(105_00);
    expect(result.vatIncluded).toBe(5_00);
    expect(result.vatRatePercent).toBe(VAT_RATE_PERCENT);
  });

  it.each([
    ["unitPrice", { unitPrice: -1 }],
    ["unitPrice", { unitPrice: 10.5 }],
    ["addOnUnitPrice", { addOnUnitPrice: -100 }],
    ["addOnUnitPrice", { addOnUnitPrice: 0.1 }],
    ["quantity", { quantity: -1 }],
    ["quantity", { quantity: 1.5 }],
    ["unitPrice", { unitPrice: Number.NaN }],
  ])("throws on a bad %s", (_label, overrides) => {
    expect(() => priceCart(input({ lines: [line(overrides)] }))).toThrow(Error);
  });

  it.each([-1, 12.5])("throws on a bad delivery fee %s", (deliveryFee) => {
    expect(() => priceCart(input({ lines: [line()], deliveryFee }))).toThrow(Error);
  });
});

describe("vatIncludedIn", () => {
  it.each([
    [105_00, 5_00],
    [100_00, 4_76],
    [0, 0],
    [1, 0],
    [21, 1],
  ])("total %i includes VAT %i", (total, vat) => {
    expect(vatIncludedIn(total)).toBe(vat);
  });

  it("uses VAT_RATE_PERCENT by default and accepts another rate", () => {
    expect(vatIncludedIn(210_00)).toBe(vatIncludedIn(210_00, VAT_RATE_PERCENT));
    expect(vatIncludedIn(110_00, 10)).toBe(10_00);
  });
});
