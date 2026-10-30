import type { OrderStatus, OrderStatusTone } from "@/lib/orders";

/* ---------- warranty status ----------
   Never stored. It is read from the line's warranty dates each time, so it
   turns Expired on its own and can't be set by hand. */

export const WARRANTY_STATUSES = ["PENDING", "ACTIVE", "EXPIRED"] as const;
export type WarrantyStatus = (typeof WARRANTY_STATUSES)[number];

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  EXPIRED: "Expired",
};

/** Orders whose lines are devices a customer holds or is about to: paid and not cancelled. */
export const WARRANTY_ORDER_STATUSES = [
  "CONFIRMED",
  "PROCESSING",
  "DISPATCHED",
  "DELIVERED",
] as const satisfies readonly OrderStatus[];

export interface WarrantyDates {
  warrantyStartsAt: Date | string | null;
  warrantyEndsAt: Date | string | null;
}

/** Pending until delivery starts the cover, Active up to the end date, Expired from it. */
export function warrantyStatus(dates: WarrantyDates, now: Date): WarrantyStatus {
  if (!dates.warrantyStartsAt || !dates.warrantyEndsAt) return "PENDING";
  if (now.getTime() < new Date(dates.warrantyStartsAt).getTime()) return "PENDING";
  return now.getTime() < new Date(dates.warrantyEndsAt).getTime() ? "ACTIVE" : "EXPIRED";
}

export function warrantyStatusTone(status: WarrantyStatus): OrderStatusTone {
  if (status === "ACTIVE") return "live";
  if (status === "EXPIRED") return "danger";
  return "muted";
}

/** Unit numbers for a line's devices: quantity 3 gives [1, 2, 3]. */
export function unitNumbers(quantity: number): number[] {
  return Array.from({ length: quantity }, (_, index) => index + 1);
}

/** "Unit 2 of 4" for a device on a line of several, "" when the line holds one. */
export function unitLabel(unitNumber: number, quantity: number): string {
  return quantity > 1 ? `Unit ${unitNumber} of ${quantity}` : "";
}

const MESSAGE_START_BEFORE_ORDER = "The warranty can't start before the order was placed.";
const MESSAGE_START_IN_FUTURE = "The warranty can't start in the future.";

/** Field error for a corrected start date, or null when it is allowed. */
export function checkWarrantyStart(startsAt: Date, placedAt: Date, now: Date): string | null {
  if (startsAt.getTime() < placedAt.getTime()) return MESSAGE_START_BEFORE_ORDER;
  if (startsAt.getTime() > now.getTime()) return MESSAGE_START_IN_FUTURE;
  return null;
}

/* ---------- claims ---------- */

export const WARRANTY_CLAIM_STATUSES = [
  "RAISED",
  "SERIAL_VERIFICATION",
  "COLLECTION",
  "ASSESSMENT",
  "REPAIR",
  "REPLACEMENT",
  "RETURNED_TO_CUSTOMER",
  "DECLINED",
] as const;
export type WarrantyClaimStatus = (typeof WARRANTY_CLAIM_STATUSES)[number];

export const WARRANTY_CLAIM_STATUS_LABELS: Record<WarrantyClaimStatus, string> = {
  RAISED: "Claim raised",
  SERIAL_VERIFICATION: "Serial verification",
  COLLECTION: "Collection",
  ASSESSMENT: "Assessment",
  REPAIR: "Repair",
  REPLACEMENT: "Replacement",
  RETURNED_TO_CUSTOMER: "Returned to customer",
  DECLINED: "Declined",
};

export const WARRANTY_CLAIM_TRANSITIONS: Record<WarrantyClaimStatus, readonly WarrantyClaimStatus[]> = {
  RAISED: ["SERIAL_VERIFICATION", "DECLINED"],
  SERIAL_VERIFICATION: ["COLLECTION", "DECLINED"],
  COLLECTION: ["ASSESSMENT"],
  ASSESSMENT: ["REPAIR", "REPLACEMENT", "DECLINED"],
  REPAIR: ["RETURNED_TO_CUSTOMER"],
  REPLACEMENT: ["RETURNED_TO_CUSTOMER"],
  RETURNED_TO_CUSTOMER: [],
  DECLINED: [],
};

export const CLOSED_WARRANTY_CLAIM_STATUSES = [
  "RETURNED_TO_CUSTOMER",
  "DECLINED",
] as const satisfies readonly WarrantyClaimStatus[];

export const OPEN_WARRANTY_CLAIM_STATUSES = WARRANTY_CLAIM_STATUSES.filter(
  (status) => !(CLOSED_WARRANTY_CLAIM_STATUSES as readonly WarrantyClaimStatus[]).includes(status),
);

export function nextClaimStatuses(status: WarrantyClaimStatus): WarrantyClaimStatus[] {
  return [...WARRANTY_CLAIM_TRANSITIONS[status]];
}

export function isClaimOpen(status: WarrantyClaimStatus): boolean {
  return WARRANTY_CLAIM_TRANSITIONS[status].length > 0;
}

export function claimStatusTone(status: WarrantyClaimStatus): OrderStatusTone {
  if (status === "RETURNED_TO_CUSTOMER") return "live";
  if (status === "DECLINED") return "danger";
  return "warn";
}

/** The label a claim's status button carries: "Move to assessment". */
export function claimActionLabel(status: WarrantyClaimStatus): string {
  return status === "DECLINED" ? "Decline claim" : `Move to ${WARRANTY_CLAIM_STATUS_LABELS[status].toLowerCase()}`;
}
