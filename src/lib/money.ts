import { formatPrice } from "@/lib/utils";

export const CURRENCY = "AED";
export const LOCALE = "en-AE";

const MINOR_PER_MAJOR = 100;
const MONEY_INPUT = /^\d+(\.\d{1,2})?$/;

export function formatMoney(minor: number) {
  return formatPrice(minor, CURRENCY, LOCALE);
}

export function toMinorUnits(value: string): number | null {
  const trimmed = value.trim();
  if (!MONEY_INPUT.test(trimmed)) return null;
  return Math.round(Number(trimmed) * MINOR_PER_MAJOR);
}

export function fromMinorUnits(minor: number | null): string {
  if (minor === null) return "";
  return (minor / MINOR_PER_MAJOR).toFixed(2);
}
