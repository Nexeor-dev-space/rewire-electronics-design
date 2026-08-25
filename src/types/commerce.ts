/**
 * Commerce domain types — the storefront half of the model.
 *
 * `@/types` describes what Rewire *sells* (products, drops, media). This
 * file describes what happens **after** someone wants one: the cart, the
 * order, the return. Kept in its own module because the catalogue types
 * are read by the marketing pages too, and those pages should not have to
 * know what a refund looks like.
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
   Orders
   ============================================================ */

export type OrderStatus =
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export interface OrderItem {
  id: string;
  slug: string;
  name: string;
  variant: string;
  condition: ConditionGrade;
  image: Media;
  price: number;
  quantity: number;
  /** False once a return window closes — drives the Return Item action. */
  returnable: boolean;
  /**
   * Add-ons purchased on this line (extended warranty, sleeve, hub, etc.),
   * captured at checkout so the order detail can print exactly what the
   * shopper committed to — independent of later catalogue changes.
   * Priced once per line, not per device quantity, matching the
   * `CartItem.addOnIds` semantics in the account provider.
   */
  addOns?: { id: string; label: string; price: number }[];
}

/** One node of the tracking rail. `at` is absent for steps not yet reached. */
export interface TrackingStep {
  label: string;
  note: string;
  at?: string;
}

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

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  isDefault?: boolean;
}

export interface Order {
  id: string;
  /** Human-facing reference, e.g. "RW-24817". */
  number: string;
  placedAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  currency: string;
  locale: string;
  /** Human phrasing — "Tuesday, 26 August" — not an ISO stamp. */
  estimatedDelivery: string;
  address: Address;
  payment: PaymentMethod;
  deliveryMethod: string;
  trackingNumber?: string;
  tracking: TrackingStep[];
}

/* ============================================================
   Returns
   ============================================================ */

export type ReturnStatus =
  | "requested"
  | "approved"
  | "in-transit"
  | "inspecting"
  | "refunded"
  | "declined";

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  "in-transit": "In transit",
  inspecting: "Inspecting",
  refunded: "Refunded",
  declined: "Declined",
};

/** Everything but `refunded` and `declined` is still in motion. */
export const ACTIVE_RETURN_STATUSES: ReturnStatus[] = [
  "requested",
  "approved",
  "in-transit",
  "inspecting",
];

export interface ReturnReason {
  id: string;
  label: string;
  /** Shown under the label once selected — sets expectations early. */
  note: string;
  /** Reasons that need the shopper to say more before we can act. */
  requiresDetail?: boolean;
}

export interface ReturnMethod {
  id: string;
  label: string;
  note: string;
  price: number;
  estimate: string;
}

export interface ReturnRecord {
  id: string;
  /** Human-facing reference, e.g. "RT-3092". */
  number: string;
  orderNumber: string;
  orderId: string;
  item: OrderItem;
  reason: string;
  status: ReturnStatus;
  requestedAt: string;
  /** Human phrasing, e.g. "Refund by 2 September". */
  expectedResolution: string;
  method: string;
  refundAmount: number;
  currency: string;
  locale: string;
  timeline: TrackingStep[];
}
