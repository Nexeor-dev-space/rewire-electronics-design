import type { Address, OrderItem, ReturnRecord, ReturnReason, ReturnStatus } from "@/types";
import { getProductBySlug } from "./catalog";
import { addOnsFor } from "./add-ons";

/**
 * Account data adapter — mock for now, CMS/DB later.
 *
 * Same swap contract as `catalog.ts`: every surface in `/account/*`
 * reads through the getters below, and the real API adapter later
 * replaces the bodies without touching a page component.
 *
 * Returns are seeded from real catalogue slugs so images, conditions
 * and prices agree with the shop; orders come from the order API.
 * Addresses persist to localStorage so the CRUD flow is reviewable
 * end-to-end (add, edit, delete, set default) without a backend.
 */

const CURRENCY = "AED";
const LOCALE = "en-AE";
const ADDRESSES_KEY = "rewire.account.addresses.v1";

interface ReturnEligibleSeed {
  orderNumber: string;
  items: { slug: string; quantity: number; addOnIds?: string[] }[];
}

const returnEligibleSeeds: ReturnEligibleSeed[] = [
  {
    orderNumber: "RW-24603",
    items: [{ slug: "macbook-air-13-m2", quantity: 1, addOnIds: ["sleeve", "charger-96w", "warranty-24"] }],
  },
];

/* ---------- Fixed addresses for the seed ---------- */

const seededAddresses: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    name: "Alex Mercer",
    line1: "Sky Loft 21B, Marina Gate 2",
    line2: "Al Marsa Street",
    city: "Dubai",
    emirate: "Dubai",
    postalCode: "00000",
    phone: "+971 50 214 8837",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Office",
    name: "Alex Mercer",
    line1: "Nexeor, One Central, Office 812",
    city: "Dubai",
    emirate: "Dubai",
    postalCode: "00000",
    phone: "+971 50 214 8837",
  },
];

function resolveItems(
  entries: {
    slug: string;
    quantity: number;
    returnable?: boolean;
    addOnIds?: string[];
  }[],
  orderId: string,
): OrderItem[] {
  return entries
    .map((entry, index): OrderItem | null => {
      const product = getProductBySlug(entry.slug);
      if (!product) return null;
      // Resolve add-on ids to their labels + prices at seed time. Same
      // pattern the checkout uses (`resolveCheckoutLines`) so an order
      // stays honest even if the add-ons catalogue changes later.
      const available = addOnsFor(product.categorySlug ?? product.category);
      const chosen = (entry.addOnIds ?? [])
        .map((id) => available.find((a) => a.id === id))
        .filter((a): a is (typeof available)[number] => Boolean(a))
        .map((a) => ({ id: a.id, label: a.label, price: a.price }));
      return {
        id: `${orderId}-${index + 1}`,
        slug: product.slug,
        name: product.name,
        variant: product.variant,
        condition: product.condition,
        image: product.images[0],
        price: product.price,
        quantity: entry.quantity,
        returnable: entry.returnable ?? true,
        addOns: chosen.length > 0 ? chosen : undefined,
      };
    })
    .filter((line): line is OrderItem => Boolean(line));
}

/* ============================================================
   Returns
   ============================================================ */

const returnReasons: ReturnReason[] = [
  { id: "changed-mind", label: "Changed my mind", note: "We'll pick it up at no cost within your return window." },
  { id: "not-as-described", label: "Not as described", note: "Something did not match the listing — please tell us what." , requiresDetail: true },
  { id: "arrived-damaged", label: "Arrived damaged", note: "We will replace or refund and cover the return." , requiresDetail: true },
  { id: "wrong-item", label: "Wrong item sent", note: "We will send the correct unit and collect this one." },
  { id: "battery-issue", label: "Battery or performance issue", note: "Certified battery health is 98%+; if not, we make it right." , requiresDetail: true },
];

const returnSeeds: ReturnRecord[] = [
  {
    id: "RT-3092",
    number: "RT-3092",
    orderNumber: "RW-24199",
    orderId: "RW-24199",
    item: (() => {
      const p = getProductBySlug("pixel-7-pro");
      return {
        id: "RW-24199-1",
        slug: "pixel-7-pro",
        name: p?.name ?? "Pixel 7 Pro",
        variant: p?.variant ?? "Obsidian · 128GB",
        condition: p?.condition ?? "excellent",
        image: p?.images[0] ?? { id: "x", url: "/images/hero/phone.png", alt: "", width: 800, height: 800 },
        price: p?.price ?? 1_299_00,
        quantity: 1,
        returnable: false,
      };
    })(),
    reason: "Battery or performance issue",
    status: "refunded",
    requestedAt: "2026-06-18T09:22:00Z",
    expectedResolution: "Refunded 24 June",
    method: "Complimentary courier pickup",
    refundAmount: 1_149_00,
    currency: CURRENCY,
    locale: LOCALE,
    timeline: [
      { label: "Return requested", note: "Reason: battery / performance issue.", at: "2026-06-18T09:22:00Z" },
      { label: "Request approved", note: "Pickup arranged.", at: "2026-06-18T15:04:00Z" },
      { label: "Pickup scheduled", note: "Aramex, 20 June, 09:00–13:00.", at: "2026-06-19T08:00:00Z" },
      { label: "Product received", note: "Delivered to inspection.", at: "2026-06-21T10:11:00Z" },
      { label: "Refund completed", note: "AED 1,149 to Mastercard 0284.", at: "2026-06-24T12:00:00Z" },
    ],
  },
  {
    id: "RT-3145",
    number: "RT-3145",
    orderNumber: "RW-24412",
    orderId: "RW-24412",
    item: (() => {
      const p = getProductBySlug("wh-1000xm4");
      return {
        id: "RW-24412-1",
        slug: "wh-1000xm4",
        name: p?.name ?? "WH-1000XM4",
        variant: p?.variant ?? "Midnight Blue",
        condition: p?.condition ?? "excellent",
        image: p?.images[0] ?? { id: "x", url: "/images/hero/headphones.png", alt: "", width: 800, height: 800 },
        price: p?.price ?? 649_00,
        quantity: 1,
        returnable: false,
      };
    })(),
    reason: "Changed my mind",
    status: "inspecting",
    requestedAt: "2026-08-10T14:22:00Z",
    expectedResolution: "Refund expected by 22 August",
    method: "Complimentary courier pickup",
    refundAmount: 649_00,
    currency: CURRENCY,
    locale: LOCALE,
    timeline: [
      { label: "Return requested", note: "Reason: changed my mind.", at: "2026-08-10T14:22:00Z" },
      { label: "Request approved", note: "Pickup arranged.", at: "2026-08-10T18:33:00Z" },
      { label: "Pickup scheduled", note: "Aramex, 13 August, 11:00–15:00.", at: "2026-08-11T09:00:00Z" },
      { label: "Product received", note: "Delivered to inspection.", at: "2026-08-15T09:44:00Z" },
      { label: "Refund processing", note: "" },
      { label: "Refund completed", note: "" },
    ],
  },
];

/* ============================================================
   Public getters
   ============================================================ */

export function getReturns(): ReturnRecord[] {
  return [...returnSeeds].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

export function getReturnReasons(): ReturnReason[] {
  return returnReasons;
}

export function getReturnEligibleItems(): { orderId: string; orderNumber: string; item: OrderItem }[] {
  return returnEligibleSeeds.flatMap((seed) =>
    resolveItems(seed.items, seed.orderNumber).map((item) => ({
      orderId: seed.orderNumber,
      orderNumber: seed.orderNumber,
      item,
    })),
  );
}

/* ============================================================
   Addresses — persisted, so CRUD is reviewable end-to-end
   ============================================================ */

function readAddresses(): Address[] {
  if (typeof window === "undefined") return seededAddresses;
  try {
    const raw = window.localStorage.getItem(ADDRESSES_KEY);
    if (!raw) return seededAddresses;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seededAddresses;
    return parsed as Address[];
  } catch {
    return seededAddresses;
  }
}

function writeAddresses(next: Address[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADDRESSES_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function getSeededAddresses(): Address[] {
  return seededAddresses;
}

export function loadAddresses(): Address[] {
  return readAddresses();
}

export function saveAddresses(next: Address[]) {
  writeAddresses(next);
}

/** Return-status labels — mirror ORDER_STATUS_LABELS but for returns. */
export function returnStatusTone(status: ReturnStatus): "live" | "warn" | "muted" | "danger" {
  if (status === "refunded") return "live";
  if (status === "declined") return "danger";
  if (status === "inspecting" || status === "in-transit") return "warn";
  return "muted";
}
