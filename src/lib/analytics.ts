import { CURRENCY, fromMinorUnits } from "@/lib/money";
import type { OrderDetail } from "@/types/order";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

const PURCHASE_TRACKED_KEY_PREFIX = "rewire.purchase-tracked.";
const TAGS_CLEARED_KEY = "rewire.storefront-tags-cleared";

function storefrontTagsRunning(): boolean {
  return [window.gtag, window.fbq, window.clarity].some((tag) => typeof tag === "function");
}

export function reloadIfStorefrontTagsRunning(): void {
  try {
    if (!storefrontTagsRunning()) {
      window.sessionStorage.removeItem(TAGS_CLEARED_KEY);
      return;
    }
    if (window.sessionStorage.getItem(TAGS_CLEARED_KEY)) return;
    window.sessionStorage.setItem(TAGS_CLEARED_KEY, "1");
  } catch {
    return;
  }
  window.location.reload();
}

function toMajorUnits(minor: number): number {
  return Number(fromMinorUnits(minor));
}

function wasTracked(key: string): boolean {
  try {
    return window.localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function markTracked(key: string): void {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    return;
  }
}

export function trackPurchase(order: OrderDetail): void {
  const { gtag, fbq } = window;
  if (typeof gtag !== "function" && typeof fbq !== "function") return;

  const key = PURCHASE_TRACKED_KEY_PREFIX + order.number;
  if (wasTracked(key)) return;

  const value = toMajorUnits(order.totals.total);

  if (typeof gtag === "function") {
    gtag("event", "purchase", {
      transaction_id: order.number,
      value,
      currency: CURRENCY,
      items: order.lines.map((line) => ({
        item_id: line.sku,
        item_name: line.productName,
        price: toMajorUnits(line.unitPrice + line.addOnUnitPrice),
        quantity: line.quantity,
      })),
    });
  }

  if (typeof fbq === "function") {
    fbq("track", "Purchase", { value, currency: CURRENCY }, { eventID: order.number });
  }

  markTracked(key);
}
