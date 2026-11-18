import "server-only";

import { appUrl } from "@/lib/app-url";
import { ACCOUNT_ORDERS_PATH, ACCOUNT_RETURNS_PATH, ORDER_TRACK_PAGE_PATH } from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import type { EmailContent } from "@/lib/email/email-outcome";
import {
  addOnEntitlementSummaryMessage,
  deliveryAttemptFailedMessage,
  deviceRecordMessage,
  type DeviceLine,
  type EntitlementLine,
} from "@/lib/email/message-templates";
import {
  orderCancelledMessage,
  orderConfirmationMessage,
  orderDeliveredMessage,
  orderDispatchedMessage,
  orderPaymentReceivedMessage,
  refundIssuedMessage,
  returnDecisionMessage,
  returnReceivedMessage,
  warrantyClaimDecisionMessage,
  warrantyClaimOpenedMessage,
} from "@/lib/email/templates";
import { dedupeKey, type MessageTrigger } from "@/lib/messaging";
import type { OrderStatus } from "@/lib/orders";
import type { ReturnStatus } from "@/lib/returns";
import { WARRANTY_CLAIM_STATUS_LABELS, unitLabel, type WarrantyClaimStatus } from "@/lib/warranty";
import { dispatchEmail } from "@/services/message.service";

/**
 * Emails to the customer when an order, return or warranty claim changes.
 * Each `notify…` runs once, after the change is committed, and never throws:
 * it goes through `dispatchEmail`, which records the outcome in the message
 * history and keeps a failed send from undoing the change. See
 * docs/ORDERS.md §16 and docs/MESSAGING.md.
 */

const LINK_TRACK_ORDER = "Track my order";
const LINK_VIEW_ORDER = "View my order";
const LINK_VIEW_RETURNS = "View my returns";
const WARRANTY_DATE_PENDING = "a date to be confirmed";

export const customerSelect = {
  number: true,
  userId: true,
  email: true,
  firstName: true,
  placedAsGuest: true,
} as const;

export interface Customer {
  number: string;
  userId: string | null;
  email: string;
  firstName: string;
  placedAsGuest: boolean;
}

interface OrderInput {
  url: string;
  linkLabel: string;
  name: string;
  number: string;
}

/** Guests get Track Order; account holders get their account page. */
export async function orderLink(order: Customer): Promise<{ url: string; linkLabel: string }> {
  if (order.placedAsGuest) {
    const query = new URLSearchParams({ number: order.number, email: order.email });
    return { url: await appUrl(`${ORDER_TRACK_PAGE_PATH}?${query}`), linkLabel: LINK_TRACK_ORDER };
  }
  return { url: await appUrl(`${ACCOUNT_ORDERS_PATH}/${order.number}`), linkLabel: LINK_VIEW_ORDER };
}

async function returnLink(order: Customer): Promise<{ url: string; linkLabel: string }> {
  if (order.placedAsGuest) return orderLink(order);
  return { url: await appUrl(ACCOUNT_RETURNS_PATH), linkLabel: LINK_VIEW_RETURNS };
}

async function safely(label: string, task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error) {
    console.error(`${label} email failed`, error);
  }
}

interface Send {
  trigger: MessageTrigger;
  customer: Pick<Customer, "email" | "userId">;
  refId: string;
  refLabel: string;
  /** Parts of the event's key: the same event never sends twice. */
  key: (string | number)[];
  content: EmailContent;
}

function send({ trigger, customer, refId, refLabel, key, content }: Send) {
  return dispatchEmail({
    trigger,
    recipient: customer.email,
    userId: customer.userId,
    refId,
    refLabel,
    dedupeKey: dedupeKey(trigger, ...key),
    build: async () => content,
  });
}

/* ---------- orders ---------- */

const orderSelect = {
  ...customerSelect,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  total: true,
  trackingNumber: true,
  carrier: true,
} as const;

/** The confirmation sent when an order is placed. */
export function notifyOrderPlaced(number: string): Promise<void> {
  return safely(`order ${number} confirmation`, async () => {
    const order = await prisma.order.findUniqueOrThrow({ where: { number }, select: orderSelect });
    const query = new URLSearchParams({ number, email: order.email });
    await send({
      trigger: "ORDER_CONFIRMATION",
      customer: order,
      refId: number,
      refLabel: `Order ${number}`,
      key: [number],
      content: orderConfirmationMessage({
        name: order.firstName,
        url: await appUrl(`${ORDER_TRACK_PAGE_PATH}?${query}`),
        number,
        total: order.total,
        paymentMethod: order.paymentMethod,
      }),
    });
  });
}

/** Card or Apple Pay paid, or staff marked the order paid. */
export function notifyOrderPaid(number: string): Promise<void> {
  return safely(`order ${number} payment`, async () => {
    const order = await prisma.order.findUniqueOrThrow({ where: { number }, select: orderSelect });
    const link = await orderLink(order);
    await send({
      trigger: "ORDER_PAYMENT_RECEIVED",
      customer: order,
      refId: number,
      refLabel: `Order ${number}`,
      key: [number],
      content: orderPaymentReceivedMessage({
        ...link,
        name: order.firstName,
        number,
        total: order.total,
        paymentMethod: order.paymentMethod,
        confirmed: order.status === "CONFIRMED",
      }),
    });
  });
}

/** The one order status change path: dispatched, delivered, cancelled, or confirmed by payment. */
export function notifyOrderStatus(number: string, status: OrderStatus): Promise<void> {
  if (status === "CONFIRMED") return notifyOrderPaid(number);
  if (status !== "DISPATCHED" && status !== "DELIVERED" && status !== "CANCELLED") return Promise.resolve();

  return safely(`order ${number} ${status}`, async () => {
    const order = await prisma.order.findUniqueOrThrow({ where: { number }, select: orderSelect });
    const input = { ...(await orderLink(order)), name: order.firstName, number };
    const base = { customer: order, refId: number, refLabel: `Order ${number}` };

    if (status === "DISPATCHED") {
      await send({
        ...base,
        trigger: "ORDER_DISPATCHED",
        key: [number, order.trackingNumber],
        content: orderDispatchedMessage({ ...input, trackingNumber: order.trackingNumber, carrier: order.carrier }),
      });
    } else if (status === "DELIVERED") {
      await send({ ...base, trigger: "ORDER_DELIVERED", key: [number], content: orderDeliveredMessage(input) });
      await sendDeliveryRecords(number, order, input);
    } else {
      await send({
        ...base,
        trigger: "ORDER_CANCELLED",
        key: [number],
        content: orderCancelledMessage({ ...input, refundApplies: order.paymentStatus !== "UNPAID" }),
      });
    }
  });
}

/** Staff logged a failed delivery attempt. `eventId` is that order event, so each attempt is its own message. */
export function notifyDeliveryAttemptFailed(number: string, eventId: string, note: string): Promise<void> {
  return safely(`order ${number} failed delivery`, async () => {
    const order = await prisma.order.findUniqueOrThrow({ where: { number }, select: orderSelect });
    await send({
      trigger: "DELIVERY_ATTEMPT_FAILED",
      customer: order,
      refId: number,
      refLabel: `Order ${number}`,
      key: [eventId],
      content: deliveryAttemptFailedMessage({ ...(await orderLink(order)), name: order.firstName, number, note }),
    });
  });
}

/* ---------- after delivery: device record and add-on entitlements ---------- */

const deliveredItemsSelect = {
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      productName: true,
      quantity: true,
      warrantyEndsAt: true,
      devices: { orderBy: { unitNumber: "asc" }, select: { unitNumber: true, serialNumber: true } },
      addOns: { select: { name: true, extraWarrantyMonths: true } },
    },
  },
} as const;

export function warrantyDate(date: Date | null): string {
  return date ? formatOrderDate(date.toISOString()) : WARRANTY_DATE_PENDING;
}

function addOnLabel(addOn: { name: string; extraWarrantyMonths: number }): string {
  return addOn.extraWarrantyMonths > 0 ? `${addOn.name} (+${addOn.extraWarrantyMonths} months cover)` : addOn.name;
}

/** The entitlement lines of an order's items that carry add-ons. */
export function entitlementLines(
  items: { productName: string; warrantyEndsAt: Date | null; addOns: { name: string; extraWarrantyMonths: number }[] }[],
): EntitlementLine[] {
  return items
    .filter((item) => item.addOns.length > 0)
    .map((item) => ({
      product: item.productName,
      addOns: item.addOns.map(addOnLabel),
      warrantyEndsAt: warrantyDate(item.warrantyEndsAt),
    }));
}

/** Delivery starts the warranty: send the device record and, when the order had add-ons, what they entitle. */
async function sendDeliveryRecords(number: string, customer: Customer, input: OrderInput) {
  const { items } = await prisma.order.findUniqueOrThrow({ where: { number }, select: deliveredItemsSelect });
  const base = { customer, refId: number, refLabel: `Order ${number}`, key: [number] };

  const devices: DeviceLine[] = items.flatMap((item) =>
    item.devices.map((device) => ({
      product: item.productName,
      unit: unitLabel(device.unitNumber, item.quantity),
      serial: device.serialNumber ?? "",
      warrantyEndsAt: warrantyDate(item.warrantyEndsAt),
    })),
  );
  if (devices.length > 0) {
    await send({ ...base, trigger: "DEVICE_RECORD", content: deviceRecordMessage({ ...input, devices }) });
  }

  const lines = entitlementLines(items);
  if (lines.length > 0) {
    await send({
      ...base,
      trigger: "ADDON_ENTITLEMENT_SUMMARY",
      content: addOnEntitlementSummaryMessage({ ...input, lines }),
    });
  }
}

/* ---------- returns ---------- */

const returnSelect = {
  number: true,
  refundAmount: true,
  refundReference: true,
  order: { select: customerSelect },
  items: { select: { quantity: true, orderItem: { select: { productName: true } } } },
} as const;

async function loadReturn(number: string) {
  const row = await prisma.returnRequest.findUniqueOrThrow({ where: { number }, select: returnSelect });
  const link = await returnLink(row.order);
  return {
    row,
    customer: row.order,
    input: { ...link, name: row.order.firstName, number, orderNumber: row.order.number },
  };
}

function sendReturn(number: string, customer: Customer, part: string, content: EmailContent) {
  return send({
    trigger: "RETURN_UPDATE",
    customer,
    refId: number,
    refLabel: `Return ${number}`,
    key: [number, part],
    content,
  });
}

export function notifyReturnReceived(number: string): Promise<void> {
  return safely(`return ${number} received`, async () => {
    const { row, customer, input } = await loadReturn(number);
    const items = row.items.map((item) => `${item.quantity} x ${item.orderItem.productName}`);
    await sendReturn(number, customer, "received", returnReceivedMessage({ ...input, items }));
  });
}

export function notifyReturnDecision(number: string, status: ReturnStatus, note?: string | null): Promise<void> {
  if (status !== "APPROVED" && status !== "DECLINED") return Promise.resolve();
  return safely(`return ${number} decision`, async () => {
    const { customer, input } = await loadReturn(number);
    await sendReturn(
      number,
      customer,
      status,
      returnDecisionMessage({ ...input, approved: status === "APPROVED", note: note ?? "" }),
    );
  });
}

export function notifyRefundIssued(number: string): Promise<void> {
  return safely(`return ${number} refund`, async () => {
    const { row, customer, input } = await loadReturn(number);
    await sendReturn(
      number,
      customer,
      "refund",
      refundIssuedMessage({ ...input, amount: row.refundAmount ?? 0, reference: row.refundReference ?? "" }),
    );
  });
}

/* ---------- warranty claims ---------- */

const claimSelect = {
  number: true,
  issue: true,
  device: {
    select: { orderItem: { select: { productName: true, order: { select: customerSelect } } } },
  },
} as const;

export async function loadClaim(number: string) {
  const row = await prisma.warrantyClaim.findUniqueOrThrow({ where: { number }, select: claimSelect });
  const { order, productName } = row.device.orderItem;
  const link = await orderLink(order);
  return {
    row,
    customer: order,
    input: { ...link, name: order.firstName, number, orderNumber: order.number, device: productName },
  };
}

function sendClaim(number: string, customer: Customer, status: WarrantyClaimStatus, content: EmailContent) {
  return send({
    trigger: "WARRANTY_CLAIM_STATUS",
    customer,
    refId: number,
    refLabel: `Warranty claim ${number}`,
    key: [number, status],
    content,
  });
}

export function notifyClaimOpened(number: string): Promise<void> {
  return safely(`claim ${number} opened`, async () => {
    const { row, customer, input } = await loadClaim(number);
    await sendClaim(number, customer, "RAISED", warrantyClaimOpenedMessage({ ...input, issue: row.issue }));
  });
}

export function notifyClaimDecision(number: string, status: WarrantyClaimStatus): Promise<void> {
  return safely(`claim ${number} decision`, async () => {
    const { customer, input } = await loadClaim(number);
    await sendClaim(
      number,
      customer,
      status,
      warrantyClaimDecisionMessage({ ...input, statusLabel: WARRANTY_CLAIM_STATUS_LABELS[status] }),
    );
  });
}
