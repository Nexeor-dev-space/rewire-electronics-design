import "server-only";

import { appUrl } from "@/lib/app-url";
import { ACCOUNT_ORDERS_PATH, ACCOUNT_RETURNS_PATH, ORDER_TRACK_PAGE_PATH } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send-email";
import {
  orderCancelledMessage,
  orderDeliveredMessage,
  orderDispatchedMessage,
  orderPaymentReceivedMessage,
  refundIssuedMessage,
  returnDecisionMessage,
  returnReceivedMessage,
  warrantyClaimDecisionMessage,
  warrantyClaimOpenedMessage,
} from "@/lib/email/templates";
import type { OrderStatus } from "@/lib/orders";
import { WARRANTY_CLAIM_STATUS_LABELS, type WarrantyClaimStatus } from "@/lib/warranty";
import type { ReturnStatus } from "@/lib/returns";

/**
 * Plain text emails to the customer when an order, return or warranty claim
 * changes. Each `notify…` runs once, after the change is committed, and never
 * throws: a failed send is logged and the change stands. See docs/ORDERS.md §16.
 */

const LINK_TRACK_ORDER = "Track my order";
const LINK_VIEW_ORDER = "View my order";
const LINK_VIEW_RETURNS = "View my returns";

const customerSelect = {
  number: true,
  email: true,
  firstName: true,
  placedAsGuest: true,
} as const;

interface Customer {
  number: string;
  email: string;
  firstName: string;
  placedAsGuest: boolean;
}

/** Guests get Track Order; account holders get their account page. */
async function orderLink(order: Customer): Promise<{ url: string; linkLabel: string }> {
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

/** Card or Apple Pay paid, or staff marked the order paid. */
export function notifyOrderPaid(number: string): Promise<void> {
  return safely(`order ${number} payment`, async () => {
    const order = await prisma.order.findUniqueOrThrow({ where: { number }, select: orderSelect });
    const link = await orderLink(order);
    await sendEmail({
      to: order.email,
      ...orderPaymentReceivedMessage({
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
    const content =
      status === "DISPATCHED"
        ? orderDispatchedMessage({ ...input, trackingNumber: order.trackingNumber, carrier: order.carrier })
        : status === "DELIVERED"
          ? orderDeliveredMessage(input)
          : orderCancelledMessage({ ...input, refundApplies: order.paymentStatus !== "UNPAID" });
    await sendEmail({ to: order.email, ...content });
  });
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
    to: row.order.email,
    input: { ...link, name: row.order.firstName, number, orderNumber: row.order.number },
  };
}

export function notifyReturnReceived(number: string): Promise<void> {
  return safely(`return ${number} received`, async () => {
    const { row, to, input } = await loadReturn(number);
    const items = row.items.map((item) => `${item.quantity} x ${item.orderItem.productName}`);
    await sendEmail({ to, ...returnReceivedMessage({ ...input, items }) });
  });
}

export function notifyReturnDecision(number: string, status: ReturnStatus, note?: string | null): Promise<void> {
  if (status !== "APPROVED" && status !== "DECLINED") return Promise.resolve();
  return safely(`return ${number} decision`, async () => {
    const { to, input } = await loadReturn(number);
    await sendEmail({ to, ...returnDecisionMessage({ ...input, approved: status === "APPROVED", note: note ?? "" }) });
  });
}

export function notifyRefundIssued(number: string): Promise<void> {
  return safely(`return ${number} refund`, async () => {
    const { row, to, input } = await loadReturn(number);
    await sendEmail({
      to,
      ...refundIssuedMessage({ ...input, amount: row.refundAmount ?? 0, reference: row.refundReference ?? "" }),
    });
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

async function loadClaim(number: string) {
  const row = await prisma.warrantyClaim.findUniqueOrThrow({ where: { number }, select: claimSelect });
  const { order, productName } = row.device.orderItem;
  const link = await orderLink(order);
  return {
    row,
    to: order.email,
    input: { ...link, name: order.firstName, number, orderNumber: order.number, device: productName },
  };
}

export function notifyClaimOpened(number: string): Promise<void> {
  return safely(`claim ${number} opened`, async () => {
    const { row, to, input } = await loadClaim(number);
    await sendEmail({ to, ...warrantyClaimOpenedMessage({ ...input, issue: row.issue }) });
  });
}

export function notifyClaimDecision(number: string, status: WarrantyClaimStatus, note?: string | null): Promise<void> {
  return safely(`claim ${number} decision`, async () => {
    const { to, input } = await loadClaim(number);
    await sendEmail({
      to,
      ...warrantyClaimDecisionMessage({ ...input, statusLabel: WARRANTY_CLAIM_STATUS_LABELS[status], note: note ?? "" }),
    });
  });
}
