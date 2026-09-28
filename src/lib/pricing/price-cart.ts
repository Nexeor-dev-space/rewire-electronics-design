import { VAT_RATE_PERCENT } from "@/lib/constants";
import { PERCENT_BASE, assertMinorUnits, lineTotal } from "@/lib/pricing/arithmetic";
import { evaluateCoupon } from "@/lib/pricing/coupon";
import type { CartPricing, PriceCartInput, PricingLine } from "@/lib/pricing/types";

export function vatIncludedIn(amount: number, ratePercent: number = VAT_RATE_PERCENT): number {
  return Math.round((amount * ratePercent) / (PERCENT_BASE + ratePercent));
}

function assertLine(line: PricingLine): void {
  assertMinorUnits(line.unitPrice, `Line ${line.key} unitPrice`);
  assertMinorUnits(line.addOnUnitPrice, `Line ${line.key} addOnUnitPrice`);
  assertMinorUnits(line.quantity, `Line ${line.key} quantity`);
}

export function priceCart(input: PriceCartInput): CartPricing {
  input.lines.forEach(assertLine);
  if (input.deliveryFee !== null) assertMinorUnits(input.deliveryFee, "deliveryFee");

  const lines = input.lines.map((line) => ({ key: line.key, lineTotal: lineTotal(line) }));
  const subtotal = input.lines
    .filter((line) => line.purchasable)
    .reduce((sum, line) => sum + lineTotal(line), 0);

  const coupon = input.coupon
    ? evaluateCoupon(input.coupon.rule, {
        lines: input.lines,
        subtotal,
        customerRedemptions: input.coupon.customerRedemptions,
        now: input.now,
      })
    : null;
  const discount = coupon?.ok ? coupon.discount : 0;

  const delivery = input.deliveryFee === null ? null : subtotal > 0 ? input.deliveryFee : 0;
  const total = subtotal - discount + (delivery ?? 0);

  return {
    lines,
    subtotal,
    discount,
    delivery,
    total,
    vatIncluded: vatIncludedIn(total),
    vatRatePercent: VAT_RATE_PERCENT,
    coupon,
  };
}
