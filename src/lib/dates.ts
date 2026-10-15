import { STORE_TIME_ZONE, STORE_TIME_ZONE_LABEL } from "@/lib/constants";
import { LOCALE } from "@/lib/money";

export function formatOrderDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatOrderStamp(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/* ---------- store time ----------
   Instants are stored and sent as UTC ISO strings. Only these helpers turn
   them into wall clock times, and always on the store's clock
   (`STORE_TIME_ZONE`), never the device's: a time typed in the console by
   someone abroad means the same moment shoppers in Dubai see. */

/** How far `STORE_TIME_ZONE` is ahead of UTC at `at`, in milliseconds. */
function storeOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return wallClockAsUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * An ISO instant as a `datetime-local` value on the store's clock,
 * "2026-11-14T18:00", or "" for none.
 */
export function toStoreDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  // Shifted so its UTC fields read as the store's wall clock.
  return new Date(at.getTime() + storeOffsetMs(at)).toISOString().slice(0, 16);
}

const DATE_TIME_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** A `datetime-local` value read on the store's clock, as an ISO instant. */
export function fromStoreDateTimeInput(value: string): string | null {
  const match = DATE_TIME_INPUT.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const at = new Date(wallClockAsUtc - storeOffsetMs(new Date(wallClockAsUtc)));
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/**
 * An instant on the store's clock, labelled: "14 Nov, 6:00 pm GST". Format it
 * on the server and hand the text to the page, so the server and the browser
 * can never print it differently.
 */
export function formatStoreDateTime(iso: string): string {
  const text = new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: STORE_TIME_ZONE,
  }).format(new Date(iso));
  return `${text} ${STORE_TIME_ZONE_LABEL}`;
}
