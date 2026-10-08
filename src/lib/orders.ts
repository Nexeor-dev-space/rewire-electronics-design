import { MS_PER_DAY } from "@/lib/constants";

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["UNPAID", "PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_METHODS = ["CARD", "APPLE_PAY", "COD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const MANUAL_PAYMENT_STATUSES = ["PAID", "UNPAID", "REFUNDED"] as const;
export type ManualPaymentStatus = (typeof MANUAL_PAYMENT_STATUSES)[number];

export const FULFILMENT_QUEUE_STATUSES = ["CONFIRMED", "PROCESSING", "DISPATCHED"] as const;
export type FulfilmentQueueStatus = (typeof FULFILMENT_QUEUE_STATUSES)[number];

export const FULFILMENT_TARGET_STATUSES = ["PROCESSING", "DISPATCHED", "DELIVERED"] as const;
export type FulfilmentTargetStatus = (typeof FULFILMENT_TARGET_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
  PARTIALLY_REFUNDED: "Partially refunded",
  REFUNDED: "Refunded",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: "Card",
  APPLE_PAY: "Apple Pay",
  COD: "Cash on delivery",
};

export const PAYMENT_LINK_NOTICE = "Our team will send a secure payment link.";
export const PAYMENT_RECEIVED_NOTE = "Payment received";
export const PLACED_STEP_LABEL = "Placed";

export type OrderStatusTone = "live" | "warn" | "muted" | "danger";

export function orderStatusTone(status: OrderStatus): OrderStatusTone {
  if (status === "DELIVERED") return "live";
  if (status === "CANCELLED") return "danger";
  if (status === "DISPATCHED" || status === "PENDING_PAYMENT") return "warn";
  return "muted";
}

export function initialStatus(method: PaymentMethod): OrderStatus {
  return method === "COD" ? "CONFIRMED" : "PENDING_PAYMENT";
}

export function awaitsPaymentLink(method: PaymentMethod): boolean {
  return initialStatus(method) === "PENDING_PAYMENT";
}

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export interface OrderState {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  refundedAmount: number;
}

export function nextStatuses(order: Pick<OrderState, "status" | "paymentStatus">): OrderStatus[] {
  return ORDER_TRANSITIONS[order.status].filter(
    (status) => status !== "CONFIRMED" || order.paymentStatus === "PAID",
  );
}

export function paymentActions(order: OrderState): ManualPaymentStatus[] {
  if (order.paymentStatus === "UNPAID") return order.status === "CANCELLED" ? [] : ["PAID"];
  if (order.paymentStatus !== "PAID") return [];

  const actions: ManualPaymentStatus[] = [];
  if (order.refundedAmount === 0) actions.push("UNPAID");
  if (order.status === "CANCELLED") actions.push("REFUNDED");
  return actions;
}

export function returnableUntil(deliveredAt: Date, windowDays: number): Date {
  return new Date(deliveredAt.getTime() + windowDays * MS_PER_DAY);
}

export function accountOrdersWhere(user: { id: string; emailVerified: boolean }) {
  return user.emailVerified
    ? { userId: user.id }
    : { userId: user.id, placedAsGuest: false as const };
}

export type OrderTimelineKey = "PLACED" | Exclude<OrderStatus, "PENDING_PAYMENT">;

export interface OrderTimelineStep {
  key: OrderTimelineKey;
  label: string;
  reached: boolean;
  current: boolean;
  at: string | null;
  note: string;
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  note: string;
  createdAt: Date;
}

const PROGRESS_STEPS = ["CONFIRMED", "PROCESSING", "DISPATCHED", "DELIVERED"] as const;

export function orderTimeline(
  status: OrderStatus,
  events: readonly OrderTimelineEvent[],
  placedAt: Date,
): OrderTimelineStep[] {
  const firstEvent = (key: OrderStatus) => events.find((event) => event.status === key);
  const reachedIndex = PROGRESS_STEPS.findIndex((key) => key === status);

  const placed: OrderTimelineStep = {
    key: "PLACED",
    label: PLACED_STEP_LABEL,
    reached: true,
    current: false,
    at: placedAt.toISOString(),
    note: "",
  };

  const progress = PROGRESS_STEPS.map((key, index): OrderTimelineStep => {
    const event = firstEvent(key);
    const reached = status === "CANCELLED" ? Boolean(event) : index <= reachedIndex;
    const pendingNote = key === "CONFIRMED" && status === "PENDING_PAYMENT" ? PAYMENT_LINK_NOTICE : "";
    return {
      key,
      label: ORDER_STATUS_LABELS[key],
      reached,
      current: false,
      at: reached && event ? event.createdAt.toISOString() : null,
      note: reached ? (event?.note ?? "") : pendingNote,
    };
  });

  const steps =
    status === "CANCELLED" ? [placed, ...progress.filter((step) => step.reached)] : [placed, ...progress];

  if (status === "CANCELLED") {
    const event = firstEvent("CANCELLED");
    steps.push({
      key: "CANCELLED",
      label: ORDER_STATUS_LABELS.CANCELLED,
      reached: true,
      current: false,
      at: event ? event.createdAt.toISOString() : null,
      note: event?.note ?? "",
    });
  }

  const last = steps.findLast((step) => step.reached);
  return steps.map((step) => (step === last ? { ...step, current: true } : step));
}
