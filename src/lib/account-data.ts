import type {
  Address,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  ReturnRecord,
  ReturnReason,
  ReturnStatus,
} from "@/types";
import { getProductBySlug } from "./catalog";
import { addOnsFor } from "./add-ons";

/**
 * Account data adapter — mock for now, CMS/DB later.
 *
 * Same swap contract as `catalog.ts`: every surface in `/account/*`
 * reads through the getters below, and the real API adapter later
 * replaces the bodies without touching a page component.
 *
 * Orders and returns are seeded from real catalogue slugs so images,
 * conditions and prices agree with the shop. Addresses persist to
 * localStorage so the CRUD flow is reviewable end-to-end (add, edit,
 * delete, set default) without a backend.
 */

const CURRENCY = "AED";
const LOCALE = "en-AE";
const ADDRESSES_KEY = "rewire.account.addresses.v1";

/* ============================================================
   Orders — one shape, five states
   ============================================================ */

interface OrderSeed {
  id: string;
  number: string;
  placedAt: string;
  status: OrderStatus;
  estimatedDelivery: string;
  delivery: number;
  discount: number;
  deliveryMethod: string;
  trackingNumber?: string;
  addressId: string;
  paymentId: string;
  items: {
    slug: string;
    quantity: number;
    returnable?: boolean;
    /** Add-on ids ticked on this line at checkout, resolved from `add-ons`. */
    addOnIds?: string[];
  }[];
  tracking: { label: string; note: string; at?: string }[];
}

const orderSeeds: OrderSeed[] = [
  {
    id: "RW-24817",
    number: "RW-24817",
    placedAt: "2026-08-14T09:12:00Z",
    status: "shipped",
    estimatedDelivery: "Wednesday, 26 August",
    delivery: 0,
    discount: 0,
    deliveryMethod: "Free standard delivery",
    trackingNumber: "AR-8817-DX",
    addressId: "addr-1",
    paymentId: "pay-1",
    items: [
      {
        slug: "iphone-15-pro-max",
        quantity: 1,
        addOnIds: ["screen-fitted", "phone-case", "warranty-24"],
      },
      { slug: "airpods-pro-2", quantity: 1 },
    ],
    tracking: [
      { label: "Order confirmed", note: "Payment authorised, unit reserved.", at: "2026-08-14T09:12:00Z" },
      { label: "Processing", note: "Final QA and packaging.", at: "2026-08-14T13:40:00Z" },
      { label: "Shipped", note: "With Emirates Post Express.", at: "2026-08-24T08:04:00Z" },
      { label: "Out for delivery", note: "" },
      { label: "Delivered", note: "" },
    ],
  },
  {
    id: "RW-24603",
    number: "RW-24603",
    placedAt: "2026-07-28T14:44:00Z",
    status: "delivered",
    estimatedDelivery: "Delivered Monday, 3 August",
    delivery: 0,
    discount: 0,
    deliveryMethod: "Free standard delivery",
    trackingNumber: "AR-8603-DX",
    addressId: "addr-1",
    paymentId: "pay-1",
    items: [
      {
        slug: "macbook-air-13-m2",
        quantity: 1,
        addOnIds: ["sleeve", "charger-96w", "warranty-24"],
      },
    ],
    tracking: [
      { label: "Order confirmed", note: "Payment authorised, unit reserved.", at: "2026-07-28T14:44:00Z" },
      { label: "Processing", note: "Final QA and packaging.", at: "2026-07-29T09:12:00Z" },
      { label: "Shipped", note: "With Emirates Post Express.", at: "2026-07-31T08:04:00Z" },
      { label: "Out for delivery", note: "Aramex courier assigned.", at: "2026-08-03T07:52:00Z" },
      { label: "Delivered", note: "Signed for at reception.", at: "2026-08-03T14:19:00Z" },
    ],
  },
  {
    id: "RW-24412",
    number: "RW-24412",
    placedAt: "2026-07-04T11:20:00Z",
    status: "delivered",
    estimatedDelivery: "Delivered Wednesday, 8 July",
    delivery: 0,
    discount: 0,
    deliveryMethod: "Free standard delivery",
    trackingNumber: "AR-8412-DX",
    addressId: "addr-2",
    paymentId: "pay-1",
    items: [
      { slug: "wh-1000xm4", quantity: 1, returnable: false },
      { slug: "96w-usb-c-adapter", quantity: 2, returnable: false },
    ],
    tracking: [
      { label: "Order confirmed", note: "Payment authorised, unit reserved.", at: "2026-07-04T11:20:00Z" },
      { label: "Processing", note: "Final QA and packaging.", at: "2026-07-04T18:10:00Z" },
      { label: "Shipped", note: "With Emirates Post Express.", at: "2026-07-06T07:44:00Z" },
      { label: "Out for delivery", note: "Aramex courier assigned.", at: "2026-07-08T08:12:00Z" },
      { label: "Delivered", note: "Left with concierge.", at: "2026-07-08T15:03:00Z" },
    ],
  },
  {
    id: "RW-24199",
    number: "RW-24199",
    placedAt: "2026-06-11T16:02:00Z",
    status: "returned",
    estimatedDelivery: "Delivered Monday, 15 June",
    delivery: 0,
    discount: 150_00,
    deliveryMethod: "Free standard delivery",
    trackingNumber: "AR-8199-DX",
    addressId: "addr-1",
    paymentId: "pay-2",
    items: [{ slug: "pixel-7-pro", quantity: 1, returnable: false }],
    tracking: [
      { label: "Order confirmed", note: "", at: "2026-06-11T16:02:00Z" },
      { label: "Processing", note: "", at: "2026-06-12T09:00:00Z" },
      { label: "Shipped", note: "", at: "2026-06-13T07:11:00Z" },
      { label: "Out for delivery", note: "", at: "2026-06-15T08:22:00Z" },
      { label: "Delivered", note: "", at: "2026-06-15T14:41:00Z" },
    ],
  },
  {
    id: "RW-24051",
    number: "RW-24051",
    placedAt: "2026-05-19T12:34:00Z",
    status: "cancelled",
    estimatedDelivery: "Cancelled 20 May",
    delivery: 0,
    discount: 0,
    deliveryMethod: "Free standard delivery",
    addressId: "addr-1",
    paymentId: "pay-1",
    items: [{ slug: "apple-watch-series-8", quantity: 1, returnable: false }],
    tracking: [
      { label: "Order confirmed", note: "Payment authorised.", at: "2026-05-19T12:34:00Z" },
      { label: "Cancelled", note: "Cancelled at the customer's request.", at: "2026-05-20T09:15:00Z" },
    ],
  },
];

/* ---------- Fixed addresses & payment methods for the seed ---------- */

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

const paymentMethods: PaymentMethod[] = [
  { id: "pay-1", brand: "Visa", last4: "6411", expiry: "09/29", isDefault: true },
  { id: "pay-2", brand: "Mastercard", last4: "0284", expiry: "02/28" },
];

/* ---------- Grade + condition helpers ---------- */

const GRADE_LABELS = {
  pristine: "A — Pristine",
  excellent: "B — Excellent",
  good: "C — Good",
} as const;

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

/**
 * Line subtotal — device (unit × qty) + add-ons (priced once per line,
 * matching the checkout's `extrasPrice` semantics).
 */
function subtotalFor(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    const addOnTotal =
      item.addOns?.reduce((s, addOn) => s + addOn.price, 0) ?? 0;
    return sum + item.price * item.quantity + addOnTotal;
  }, 0);
}

function buildOrder(seed: OrderSeed): Order {
  const items = resolveItems(seed.items, seed.id);
  const subtotal = subtotalFor(items);
  const address =
    seededAddresses.find((a) => a.id === seed.addressId) ?? seededAddresses[0];
  const payment =
    paymentMethods.find((p) => p.id === seed.paymentId) ?? paymentMethods[0];
  return {
    id: seed.id,
    number: seed.number,
    placedAt: seed.placedAt,
    status: seed.status,
    items,
    subtotal,
    delivery: seed.delivery,
    discount: seed.discount,
    total: subtotal + seed.delivery - seed.discount,
    currency: CURRENCY,
    locale: LOCALE,
    estimatedDelivery: seed.estimatedDelivery,
    address,
    payment,
    deliveryMethod: seed.deliveryMethod,
    trackingNumber: seed.trackingNumber,
    tracking: seed.tracking,
  };
}

const orders: Order[] = orderSeeds.map(buildOrder);

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

export function getOrders(): Order[] {
  return [...orders].sort(
    (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime(),
  );
}

export function getOrderById(id: string): Order | undefined {
  return orders.find((order) => order.id === id);
}

/** Latest N orders — used on the account overview. */
export function getRecentOrders(limit = 3): Order[] {
  return getOrders().slice(0, limit);
}

/** Products the user has actually ordered, most recent first, deduped by slug. */
export function getRecentOrderedProducts(limit = 4): OrderItem[] {
  const seen = new Set<string>();
  const out: OrderItem[] = [];
  for (const order of getOrders()) {
    for (const item of order.items) {
      if (seen.has(item.slug)) continue;
      seen.add(item.slug);
      out.push(item);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export function getReturns(): ReturnRecord[] {
  return [...returnSeeds].sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime(),
  );
}

export function getReturnReasons(): ReturnReason[] {
  return returnReasons;
}

export function getPaymentMethods(): PaymentMethod[] {
  return paymentMethods;
}

/** Delivered orders whose items still qualify for the return window. */
export function getReturnEligibleItems(): { orderId: string; orderNumber: string; item: OrderItem }[] {
  const out: { orderId: string; orderNumber: string; item: OrderItem }[] = [];
  for (const order of getOrders()) {
    if (order.status !== "delivered") continue;
    for (const item of order.items) {
      if (!item.returnable) continue;
      out.push({ orderId: order.id, orderNumber: order.number, item });
    }
  }
  return out;
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

/* ============================================================
   Label helpers — shared between list and detail
   ============================================================ */

export function conditionLabelFor(item: OrderItem): { condition: string; grade: string } {
  return {
    condition: "Refurbished",
    grade: GRADE_LABELS[item.condition],
  };
}

/** ISO → "Aug 14, 2026". Kept UTC to match server render. */
export function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/** ISO → "14 Aug, 09:12" for tracking rail. */
export function formatOrderStamp(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

/** Return-status labels — mirror ORDER_STATUS_LABELS but for returns. */
export function returnStatusTone(status: ReturnStatus): "live" | "warn" | "muted" | "danger" {
  if (status === "refunded") return "live";
  if (status === "declined") return "danger";
  if (status === "inspecting" || status === "in-transit") return "warn";
  return "muted";
}

/** Order-status → tone token for the pill. */
export function orderStatusTone(status: OrderStatus): "live" | "warn" | "muted" | "danger" {
  if (status === "delivered") return "live";
  if (status === "cancelled" || status === "returned") return "danger";
  if (status === "shipped") return "warn";
  return "muted";
}
