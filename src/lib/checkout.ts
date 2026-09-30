/**
 * Checkout — the mock order persisted after a `Place Order`.
 *
 * The cart's own lines, totals, coupon and delivery quote now come from
 * the real API (`src/hooks/use-cart.ts`); this module keeps only the
 * mock order record that the success page reads back, until real order
 * creation lands in Phase 5.
 */

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
