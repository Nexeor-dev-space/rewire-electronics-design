import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

/** Percentage saved vs. original price, rounded. */
export function savingsPercent(price: number, originalPrice: number) {
  if (originalPrice <= 0 || price >= originalPrice) return 0;
  return Math.round((1 - price / originalPrice) * 100);
}

/** Pad a countdown segment: 7 → "07". */
export function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}
