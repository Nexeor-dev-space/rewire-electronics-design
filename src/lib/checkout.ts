import type { ConditionGrade, Product } from "@/types";
import { getProductBySlug } from "./catalog";

/**
 * Checkout basket adapter — the demo bag.
 *
 * A checkout page needs *something* in the bag to render honestly; the
 * three lines below are that something. Reads from the catalogue so
 * every price, image, condition and grade agrees with the same product's
 * detail page — no chance of a checkout that quietly disagrees with what
 * the shopper just added.
 *
 * When a real cart store lands, replace the body of `getCheckoutBag`
 * with the store read; the return type is stable.
 */

export interface CheckoutLine {
  key: string;
  product: Product;
  /** Storage / size / colour label — one line, no icon. */
  variantLabel: string;
  /** Condition family, e.g. "Refurbished". */
  condition: string;
  /** Grade string when applicable, e.g. "A — Pristine". */
  grade?: string;
  quantity: number;
  /** Selling price at time of add, in minor units. */
  unitPrice: number;
  originalUnitPrice?: number;
}

const GRADE_LABELS: Record<ConditionGrade, string> = {
  pristine: "A — Pristine",
  excellent: "B — Excellent",
  good: "C — Good",
};

/** Demo composition: one flagship phone, one companion, one accessory. */
const bag: { slug: string; quantity: number }[] = [
  { slug: "iphone-15-pro-max", quantity: 1 },
  { slug: "airpods-max", quantity: 1 },
  { slug: "96w-usb-c-adapter", quantity: 1 },
];

export function getCheckoutBag(): CheckoutLine[] {
  return bag
    .map((entry): CheckoutLine | null => {
      const product = getProductBySlug(entry.slug);
      if (!product) return null;
      return {
        key: `${product.slug}-${entry.quantity}`,
        product,
        variantLabel: product.variant,
        condition: "Refurbished",
        grade: GRADE_LABELS[product.condition],
        quantity: entry.quantity,
        unitPrice: product.price,
        originalUnitPrice: product.originalPrice,
      };
    })
    .filter((line): line is CheckoutLine => Boolean(line));
}

export interface CheckoutTotals {
  subtotal: number;
  originalSubtotal: number;
  savings: number;
  currency: string;
  locale: string;
}

/**
 * Totals derived from the bag alone — delivery and any discount are
 * decided in the UI and folded in there, so this function stays
 * agnostic to which delivery option is selected.
 */
export function totalsFor(lines: CheckoutLine[]): CheckoutTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const originalSubtotal = lines.reduce(
    (sum, line) =>
      sum + (line.originalUnitPrice ?? line.unitPrice) * line.quantity,
    0,
  );
  const first = lines[0]?.product;
  return {
    subtotal,
    originalSubtotal,
    savings: Math.max(0, originalSubtotal - subtotal),
    currency: first?.currency ?? "AED",
    locale: first?.locale ?? "en-AE",
  };
}
