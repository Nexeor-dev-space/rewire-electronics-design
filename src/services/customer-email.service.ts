import "server-only";

import { appUrl } from "@/lib/app-url";
import { ACCOUNT_ORDERS_PATH, ACCOUNT_RETURNS_PATH, ORDER_TRACK_PAGE_PATH } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { EmailContent } from "@/lib/email/email-outcome";
import {
  refundIssuedMessage,
  returnDecisionMessage,
  returnReceivedMessage,
  warrantyClaimDecisionMessage,
  warrantyClaimOpenedMessage,
} from "@/lib/email/templates";
import { orderEmail, type OrderEmailKind } from "@/lib/email/order-email";
import { dedupeKey, type MessageTrigger } from "@/lib/messaging";
import type { OrderStatus } from "@/lib/orders";
import type { ReturnStatus } from "@/lib/returns";
import { WARRANTY_CLAIM_STATUS_LABELS, type WarrantyClaimStatus } from "@/lib/warranty";
import { loadOrderEmailImages } from "@/services/email-images.service";
import { dispatchEmail } from "@/services/message.service";
import { getInvoiceSettings } from "@/services/store-settings.service";
import type { OrderDetail } from "@/types/order";

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

async function trackOrderLink(order: Customer): Promise<{ url: string; linkLabel: string }> {
  const query = new URLSearchParams({ number: order.number, email: order.email });
  return { url: await appUrl(`${ORDER_TRACK_PAGE_PATH}?${query}`), linkLabel: LINK_TRACK_ORDER };
}

/** Guests get Track Order; account holders get their account page. */
export async function orderLink(order: Customer): Promise<{ url: string; linkLabel: string }> {
  if (order.placedAsGuest) return trackOrderLink(order);
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

/** The order statuses that email the customer. PROCESSING is deliberately not one of them. */
const NOTIFIED_STATUSES: readonly OrderStatus[] = ["DISPATCHED", "DELIVERED", "CANCELLED"];

const orderSelect = { ...customerSelect } as const;

async function loadOrderDetail(number: string): Promise<OrderDetail> {
  // Imported when needed: order.service imports this file to send these emails.
  const { getOrderDetail } = await import("@/services/order.service");
  const order = await getOrderDetail({ number });
  if (!order) throw new Error(`order ${number} not found`);
  return order;
}

interface OrderSend {
  number: string;
  trigger: MessageTrigger;
  kind: OrderEmailKind;
  /** Parts of the event's key, read from the order as it is now. */
  key: (order: OrderDetail) => (string | number)[];
  /** The record the message is about, when it is not the order itself (an order line). */
  refId?: string;
  /** The order as the caller already has it. */
  order?: OrderDetail;
  /** Sends nothing when this is false for the order as it is now. */
  onlyIf?: (order: OrderDetail) => boolean;
}

/**
 * One branded order email. The layout is shared; the wording, icon and
 * subject follow `kind`, and everything shown is read from the live order and
 * the saved store details. Returns the customer and link, so a caller can
 * send a follow up to the same person.
 */
async function sendOrderEmail({ number, trigger, kind, key, refId, order: loaded, onlyIf }: OrderSend) {
  const order = loaded ?? (await loadOrderDetail(number));
  if (onlyIf && !onlyIf(order)) return null;
  const [customer, siteUrl, settings, images] = await Promise.all([
    prisma.order.findUniqueOrThrow({ where: { number }, select: orderSelect }),
    appUrl("/"),
    getInvoiceSettings(),
    loadOrderEmailImages(order),
  ]);
  const link = kind.type === "PLACED" ? await trackOrderLink(customer) : await orderLink(customer);

  await send({
    trigger,
    customer,
    refId: refId ?? number,
    refLabel: `Order ${number}`,
    key: key(order),
    content: {
      ...orderEmail(
        order,
        {
          siteUrl,
          cta: { label: link.linkLabel, url: link.url },
          contact: {
            email: settings.sellerEmail,
            phone: settings.phone,
            whatsapp: settings.whatsapp,
            hours: settings.supportHours,
          },
          legal: { name: settings.sellerName, address: settings.sellerAddress, trn: settings.sellerTrn },
          year: new Date().getFullYear(),
          images,
        },
        kind,
      ),
      images: images.attachments,
    },
  });
  return { customer, link };
}

/** A timed order email (review request, warranty notices), sent by the scheduler. Never throws. */
export function notifyOrderEmail(input: Omit<OrderSend, "order" | "onlyIf">): Promise<void> {
  return safely(`order ${input.number} ${input.trigger}`, async () => {
    await sendOrderEmail(input);
  });
}

/** The confirmation sent when an order is placed. */
export function notifyOrderPlaced(order: OrderDetail): Promise<void> {
  return safely(`order ${order.number} confirmation`, async () => {
    await sendOrderEmail({
      number: order.number,
      order,
      trigger: "ORDER_CONFIRMATION",
      kind: { type: "PLACED" },
      key: (current) => [current.number],
    });
  });
}

/** Card or Apple Pay paid, or staff marked the order paid. */
export function notifyOrderPaid(number: string): Promise<void> {
  return safely(`order ${number} payment`, async () => {
    await sendOrderEmail({
      number,
      trigger: "ORDER_PAYMENT_RECEIVED",
      kind: { type: "PAYMENT_RECEIVED" },
      key: (current) => [current.number],
    });
  });
}

/**
 * The one order status change path. Paid (confirmed), dispatched, delivered
 * and cancelled email the customer; every other status, Processing included,
 * sends nothing.
 */
export function notifyOrderStatus(number: string, status: OrderStatus): Promise<void> {
  if (status === "CONFIRMED") return notifyOrderPaid(number);
  if (!NOTIFIED_STATUSES.includes(status)) return Promise.resolve();

  return safely(`order ${number} ${status}`, async () => {
    if (status === "DISPATCHED") {
      await sendOrderEmail({
        number,
        trigger: "ORDER_DISPATCHED",
        kind: { type: "DISPATCHED" },
        key: (current) => [current.number, current.trackingNumber],
      });
    } else if (status === "DELIVERED") {
      await sendOrderEmail({
        number,
        trigger: "ORDER_DELIVERED",
        kind: { type: "DELIVERED" },
        key: (current) => [current.number],
      });
      // Delivery starts the warranty: the device record, and what any add-ons entitle.
      await sendOrderEmail({ number, trigger: "DEVICE_RECORD", kind: { type: "DEVICE_RECORD" }, key: (current) => [current.number] });
      await sendOrderEmail({
        number,
        trigger: "ADDON_ENTITLEMENT_SUMMARY",
        kind: { type: "ADDON_SUMMARY" },
        key: (current) => [current.number],
        onlyIf: (current) => current.lines.some((line) => line.addOns.length > 0),
      });
    } else {
      await sendOrderEmail({
        number,
        trigger: "ORDER_CANCELLED",
        kind: { type: "CANCELLED" },
        key: (current) => [current.number],
      });
    }
  });
}

/** Staff logged a failed delivery attempt. `eventId` is that order event, so each attempt is its own message. */
export function notifyDeliveryAttemptFailed(number: string, eventId: string, note: string): Promise<void> {
  return safely(`order ${number} failed delivery`, async () => {
    await sendOrderEmail({
      number,
      trigger: "DELIVERY_ATTEMPT_FAILED",
      kind: { type: "DELIVERY_FAILED", note },
      key: () => [eventId],
    });
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
