/**
 * Commerce domain types — the storefront half of the model.
 *
 * `@/types` describes what Rewire *sells* (products, drops, media). This
 * file describes what happens **after** someone wants one: the cart and
 * the delivery address. Kept in its own module because the catalogue types
 * are read by the marketing pages too.
 *
 * Same contract as the rest of the data layer: every shape here mirrors a
 * future Payload collection, so the mock adapters in `@/lib/commerce` can
 * be swapped for CMS queries without a component changing.
 */

import type { ConditionGrade, Media } from "./index";

/* ============================================================
   Availability — one vocabulary, used everywhere
   ============================================================ */

/**
 * Four states, because four is what a shopper can actually act on:
 * buy it, hurry, wait for it, or ask to be told. Stock counts are a
 * *detail* of these states, never a substitute — "3 in stock" means
 * nothing until you know whether 3 is a lot.
 */
export type Availability = "in-stock" | "low-stock" | "sold-out" | "coming-soon";

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "sold-out": "Sold out",
  "coming-soon": "Coming soon",
};

/** Below this, a device is scarce enough to say so on the card. */
export const LOW_STOCK_THRESHOLD = 4;

/** Derives availability from stock so a badge can never contradict a count. */
export function availabilityFromStock(
  stock: number,
  soldOut?: boolean,
): Availability {
  if (soldOut || stock <= 0) return "sold-out";
  return stock < LOW_STOCK_THRESHOLD ? "low-stock" : "in-stock";
}

/* ============================================================
   Product options — storage, colour
   ============================================================ */

export interface ProductOption {
  label: string;
  value: string;
  /** Out-of-stock permutations stay visible but unselectable. */
  available: boolean;
  /** Difference from the base price, in minor units. May be negative. */
  priceDelta?: number;
  /** Hex swatch, colour options only. */
  swatch?: string;
}

/* ============================================================
   Product detail content
   ============================================================ */

export interface SpecGroup {
  title: string;
  rows: { label: string; value: string }[];
}

/**
 * One line of the inspection report. `passed` is deliberately separate
 * from `result` — the report has to be able to say "replaced" or
 * "serviced" honestly and still count as a pass, which a boolean alone
 * cannot express and a bare string cannot be styled from.
 */
export interface InspectionCheck {
  label: string;
  result: string;
  passed: boolean;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  /** ISO date. */
  postedAt: string;
  verified: boolean;
}

/* ============================================================
   Cart
   ============================================================ */

/**
 * A cart line is a **snapshot**, not a pointer. It carries the price and
 * finish that were on screen when the shopper committed, so a catalogue
 * edit mid-session cannot silently change what is in someone's bag.
 */
export interface CartLine {
  /** Product slug + selected options — the permutation, not the product. */
  id: string;
  productId: string;
  slug: string;
  name: string;
  variant: string;
  condition: ConditionGrade;
  batteryHealth?: number;
  image: Media;
  price: number;
  originalPrice?: number;
  currency: string;
  quantity: number;
  /** Units available for this permutation — caps the quantity stepper. */
  stock: number;
}

export interface DeliveryOption {
  id: string;
  label: string;
  note: string;
  /** Minor units. Zero renders as "Free". */
  price: number;
  estimate: string;
}

export interface CartTotals {
  subtotal: number;
  /** Sum of (originalPrice − price) across the bag. */
  savings: number;
  delivery: number;
  discount: number;
  total: number;
  currency: string;
}

/* ============================================================
   Addresses
   ============================================================ */

export interface Address {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  emirate: string;
  postalCode?: string;
  phone: string;
  isDefault?: boolean;
}
