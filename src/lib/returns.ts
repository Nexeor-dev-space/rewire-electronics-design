import type { OrderStatus, OrderStatusTone, PaymentStatus } from "@/lib/orders";

export const RETURN_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "DECLINED",
  "IN_TRANSIT",
  "RECEIVED",
  "INSPECTING",
  "REFUNDED",
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const RETURN_REASONS = [
  "CHANGED_MIND",
  "NOT_AS_DESCRIBED",
  "ARRIVED_DAMAGED",
  "WRONG_ITEM",
  "BATTERY_ISSUE",
] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  DECLINED: "Declined",
  IN_TRANSIT: "In transit",
  RECEIVED: "Received",
  INSPECTING: "Inspecting",
  REFUNDED: "Refunded",
};

export interface ReturnReasonMeta {
  label: string;
  note: string;
  requiresDetail: boolean;
}

export const RETURN_REASON_META: Record<ReturnReason, ReturnReasonMeta> = {
  CHANGED_MIND: {
    label: "Changed my mind",
    note: "We'll pick it up at no cost within your return window.",
    requiresDetail: false,
  },
  NOT_AS_DESCRIBED: {
    label: "Not as described",
    note: "Something did not match the listing — please tell us what.",
    requiresDetail: true,
  },
  ARRIVED_DAMAGED: {
    label: "Arrived damaged",
    note: "We will replace or refund and cover the return.",
    requiresDetail: true,
  },
  WRONG_ITEM: {
    label: "Wrong item sent",
    note: "We will send the correct unit and collect this one.",
    requiresDetail: false,
  },
  BATTERY_ISSUE: {
    label: "Battery or performance issue",
    note: "Certified battery health is 98%+; if not, we make it right.",
    requiresDetail: true,
  },
};

export const ACTIVE_RETURN_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "IN_TRANSIT",
  "RECEIVED",
  "INSPECTING",
] as const satisfies readonly ReturnStatus[];

export const CLOSED_RETURN_STATUSES = ["DECLINED", "REFUNDED"] as const satisfies readonly ReturnStatus[];

export const RETURN_STATE_FILTERS = ["active", "closed"] as const;
export type ReturnStateFilter = (typeof RETURN_STATE_FILTERS)[number];

export function returnStatusTone(status: ReturnStatus): OrderStatusTone {
  if (status === "REFUNDED") return "live";
  if (status === "DECLINED") return "danger";
  if (status === "IN_TRANSIT" || status === "INSPECTING") return "warn";
  return "muted";
}

export function isReturnable(
  order: { status: OrderStatus; returnableUntil: Date | string | null },
  now: Date,
): boolean {
  if (order.status !== "DELIVERED" || !order.returnableUntil) return false;
  return now.getTime() < new Date(order.returnableUntil).getTime();
}

export function returnableQuantity(bought: number, returned: number): number {
  return Math.max(0, bought - returned);
}

export interface ReturnableLine {
  orderItemId: string;
  returnableQuantity: number;
}

export interface RequestedReturnItem {
  orderItemId: string;
  quantity: number;
}

export type ReturnItemErrors = Record<string, string[]>;

const MESSAGE_ITEM_NOT_ON_ORDER = "That item isn't on this order.";
const MESSAGE_ITEM_LISTED_TWICE = "That item is listed twice.";
const MESSAGE_ITEM_NOTHING_LEFT = "Nothing is left to return on this item.";

function overLimitMessage(returnable: number) {
  return returnable === 0 ? MESSAGE_ITEM_NOTHING_LEFT : `Only ${returnable} can be returned.`;
}

export function checkReturnItems(
  lines: readonly ReturnableLine[],
  requested: readonly RequestedReturnItem[],
): ReturnItemErrors | null {
  const errors: ReturnItemErrors = {};
  const seen = new Set<string>();

  requested.forEach((item, index) => {
    const line = lines.find((candidate) => candidate.orderItemId === item.orderItemId);
    if (!line) {
      errors[`items.${index}.orderItemId`] = [MESSAGE_ITEM_NOT_ON_ORDER];
      return;
    }
    if (seen.has(item.orderItemId)) {
      errors[`items.${index}.orderItemId`] = [MESSAGE_ITEM_LISTED_TWICE];
      return;
    }
    seen.add(item.orderItemId);
    if (item.quantity < 1 || item.quantity > line.returnableQuantity) {
      errors[`items.${index}.quantity`] = [overLimitMessage(line.returnableQuantity)];
    }
  });

  return Object.keys(errors).length > 0 ? errors : null;
}

export const RETURN_TRANSITIONS: Record<ReturnStatus, readonly ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "DECLINED"],
  APPROVED: ["IN_TRANSIT", "RECEIVED", "DECLINED"],
  IN_TRANSIT: ["RECEIVED"],
  RECEIVED: ["INSPECTING", "DECLINED"],
  INSPECTING: ["DECLINED"],
  REFUNDED: [],
  DECLINED: [],
};

export const REFUNDABLE_RETURN_STATUSES = ["RECEIVED", "INSPECTING"] as const satisfies readonly ReturnStatus[];

export function nextReturnStatuses(status: ReturnStatus): ReturnStatus[] {
  return [...RETURN_TRANSITIONS[status]];
}

export function canRefund(status: ReturnStatus): boolean {
  return (REFUNDABLE_RETURN_STATUSES as readonly ReturnStatus[]).includes(status);
}

export interface RefundableOrder {
  total: number;
  refundedAmount: number;
  paymentStatus: PaymentStatus;
}

export interface PricedOrder extends RefundableOrder {
  subtotal: number;
  discount: number;
}

export interface RefundLine {
  unitPrice: number;
  addOnUnitPrice: number;
  quantity: number;
}

export function refundableAmount(order: RefundableOrder): number {
  if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") return 0;
  return Math.max(0, order.total - order.refundedAmount);
}

export function suggestedRefund(order: PricedOrder, items: readonly RefundLine[]): number {
  if (order.subtotal === 0) return 0;
  const gross = items.reduce((sum, item) => sum + (item.unitPrice + item.addOnUnitPrice) * item.quantity, 0);
  const share = Math.round((gross * (order.subtotal - order.discount)) / order.subtotal);
  return Math.max(0, Math.min(share, refundableAmount(order)));
}

export function paymentStatusAfterRefund(total: number, refundedAfter: number): PaymentStatus {
  return refundedAfter === total ? "REFUNDED" : "PARTIALLY_REFUNDED";
}
