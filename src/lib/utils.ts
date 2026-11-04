import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A random version 4 UUID. Use this instead of `crypto.randomUUID()` in
 * browser code: browsers only offer `randomUUID` on HTTPS or localhost, so
 * it is missing when the site is opened over plain HTTP on a LAN address
 * (testing on a phone). `getRandomValues` exists everywhere.
 */
export function randomUuid(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Format a price in minor units (cents) as a display string. */
export function formatPrice(
  cents: number,
  currency: string = "USD",
  locale: string = "en-US",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Percentage saved vs. original price, rounded. */
export function savingsPercent(price: number, originalPrice: number) {
  if (originalPrice <= 0 || price >= originalPrice) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}

/**
 * Format a drop timestamp as an editorial date: "14 August 2026".
 * Pinned to UTC so the server and client always agree — a local-timezone
 * format would render a different day either side of hydration.
 */
export function formatDropDate(iso: string, locale: string = "en-GB") {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Pad a countdown segment: 7 → "07". */
export function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}
