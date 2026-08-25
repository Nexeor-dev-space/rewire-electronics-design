import type { ConditionGrade, Product } from "@/types";
import type { CartItem } from "@/components/providers/account-provider";
import { getProductBySlug } from "./catalog";
import { addOnsFor } from "./add-ons";

/**
 * Checkout adapter — resolves cart lines to display-ready shape.
 *
 * The cart store keeps its lines lean: slug + qty + line id. The
 * checkout page needs the enriched view — product, price, image,
 * condition, grade. This module does that resolution and derives the
 * per-order totals. Nothing here talks to the store directly; the
 * caller passes `items` in so the same helpers work for the summary,
 * the success page, and any future admin surface.
 */

export interface CheckoutLine {
  key: string;
  product: Product;
  /** Storage / colour label — one line, no icon. */
  variantLabel: string;
  /** Condition family, e.g. "Refurbished". */
  condition: string;
  /** Grade string when applicable, e.g. "A — Pristine". */
  grade?: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice?: number;
  /**
   * Sum of the line's ticked add-ons, priced once per line (see
   * `CartItem.addOnIds`). Zero when nothing is ticked, so the arithmetic
   * below can add it unconditionally.
   */
  extrasPrice: number;
  /** Labels of the ticked add-ons, for the order summary's line detail. */
  extrasLabels: string[];
}

const GRADE_LABELS: Record<ConditionGrade, string> = {
  pristine: "A — Pristine",
  excellent: "B — Excellent",
  good: "C — Good",
};

/** Turn cart lines into checkout lines, dropping any slug that no
 *  longer resolves against the catalogue. */
export function resolveCheckoutLines(items: CartItem[]): CheckoutLine[] {
  return items
    .map((entry): CheckoutLine | null => {
      const product = getProductBySlug(entry.productSlug);
      if (!product) return null;
      const addOns = addOnsFor(product.categorySlug ?? product.category);
      const selected = entry.addOnIds ?? [];
      const ticked = addOns.filter((addOn) => selected.includes(addOn.id));
      return {
        key: entry.id,
        product,
        variantLabel: product.variant,
        condition: "Refurbished",
        grade: GRADE_LABELS[product.condition],
        quantity: entry.quantity,
        unitPrice: product.price,
        originalUnitPrice: product.originalPrice,
        extrasPrice: ticked.reduce((sum, addOn) => sum + addOn.price, 0),
        extrasLabels: ticked.map((addOn) => addOn.label),
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
 * agnostic to which delivery option or promo is selected.
 */
export function totalsFor(lines: CheckoutLine[]): CheckoutTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity + line.extrasPrice,
    0,
  );
  // Extras join both sides of the comparison — accessories are never
  // discounted, so they must not manufacture phantom "savings".
  const originalSubtotal = lines.reduce(
    (sum, line) =>
      sum +
      (line.originalUnitPrice ?? line.unitPrice) * line.quantity +
      line.extrasPrice,
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

/**
 * Promo codes — a small demo set so the input can be exercised. Real
 * codes will come from the discounts collection in the CMS; this shape
 * is the same, so the check function stays.
 */
export interface PromoCode {
  code: string;
  /** Percentage off subtotal, 0–100. */
  percent: number;
  label: string;
}

const PROMO_CODES: PromoCode[] = [
  { code: "REWIRE10", percent: 10, label: "10% off · welcome" },
  { code: "KIT5", percent: 5, label: "5% off · kit builder" },
];

export function findPromo(code: string): PromoCode | undefined {
  const normalised = code.trim().toUpperCase();
  return PROMO_CODES.find((p) => p.code === normalised);
}

export function discountAmount(subtotal: number, promo: PromoCode | undefined) {
  if (!promo) return 0;
  return Math.round((subtotal * promo.percent) / 100);
}

/**
 * Persisted order shape — what the success page reads back after a
 * `Place Order`. localStorage-backed until a real backend lands.
 */
export interface PlacedOrder {
  id: string;
  number: string;
  placedAt: string;
  lines: {
    slug: string;
    name: string;
    variantLabel: string;
    condition: string;
    grade?: string;
    quantity: number;
    unitPrice: number;
    imageUrl?: string;
    imageAlt?: string;
    imageFit?: "cover" | "contain";
  }[];
  contact: { email: string; phone: string };
  address: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    emirate: string;
    country: string;
    postalCode?: string;
    phone: string;
  };
  deliveryLabel: string;
  deliveryEstimate: string;
  deliveryPrice: number;
  paymentLabel: string;
  promoCode?: string;
  discount: number;
  subtotal: number;
  total: number;
  currency: string;
  locale: string;
}

const ORDER_KEY = "rewire.lastOrder";

export function persistOrder(order: PlacedOrder) {
  try {
    window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    /* storage unavailable */
  }
}

export function readLastOrder(): PlacedOrder | null {
  try {
    const raw = window.localStorage.getItem(ORDER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PlacedOrder;
  } catch {
    return null;
  }
}

/** Produces a stable, human-facing order reference. */
export function nextOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `RW-${stamp}${rand}`;
}
