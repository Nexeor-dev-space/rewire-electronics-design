import type Stripe from "stripe";
import {
  CHECKOUT_PAYMENT_WINDOW_MINUTES,
  CHECKOUT_SESSION_ID_PARAM,
  CHECKOUT_SESSION_REUSE_MIN_MINUTES,
  MS_PER_MINUTE,
} from "@/lib/constants";
import { CURRENCY } from "@/lib/money";
import type { OrderStatus, PaymentStatus } from "@/lib/orders";

/**
 * Pure rules for Stripe Checkout: what a payment page asks for, and whether
 * a returned session paid for an order. The Stripe calls are in
 * `src/services/payment.service.ts`. See docs/PAYMENTS.md.
 */

const STRIPE_CURRENCY = CURRENCY.toLowerCase();
const ORDER_NUMBER_METADATA_KEY = "orderNumber";
/** Stripe swaps this for the real session id when it redirects to the success url. */
const SESSION_ID_TEMPLATE = "{CHECKOUT_SESSION_ID}";
const MS_PER_SECOND = 1000;

interface PayableOrder {
  number: string;
  total: number;
  email: string;
}

interface ReturnUrls {
  success: string;
  cancel: string;
}

type SessionCheck = Pick<Stripe.Checkout.Session, "payment_status" | "amount_total" | "currency" | "metadata">;

export function checkoutSessionParams(
  order: PayableOrder,
  urls: ReturnUrls,
  now: Date,
): Stripe.Checkout.SessionCreateParams {
  const metadata = { [ORDER_NUMBER_METADATA_KEY]: order.number };
  const closesAt = now.getTime() + CHECKOUT_PAYMENT_WINDOW_MINUTES * MS_PER_MINUTE;
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: STRIPE_CURRENCY,
          unit_amount: order.total,
          product_data: { name: `Order ${order.number}` },
        },
      },
    ],
    client_reference_id: order.number,
    customer_email: order.email,
    metadata,
    payment_intent_data: { metadata },
    success_url: `${urls.success}&${CHECKOUT_SESSION_ID_PARAM}=${SESSION_ID_TEMPLATE}`,
    cancel_url: urls.cancel,
    expires_at: Math.floor(closesAt / MS_PER_SECOND),
  };
}

/** The order number we put on both the session and its payment (`checkoutSessionParams`). */
export function metadataOrderNumber(object: { metadata: Stripe.Metadata | null }): string | null {
  return object.metadata?.[ORDER_NUMBER_METADATA_KEY] ?? null;
}

/** Paid, for this order, for its whole total in AED. Anything else leaves the order unpaid. */
export function isPaidFor(session: SessionCheck, order: Pick<PayableOrder, "number" | "total">): boolean {
  return (
    session.payment_status === "paid" &&
    metadataOrderNumber(session) === order.number &&
    session.amount_total === order.total &&
    session.currency === STRIPE_CURRENCY
  );
}

export function sessionPaymentIntentId(session: Pick<Stripe.Checkout.Session, "payment_intent">): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === "string" ? intent : intent.id;
}

/**
 * What a confirmed Stripe payment means for an order. The payment id already
 * on the order tells a resent event apart from a second payment.
 */
export type PaymentOutcome = "MARK_PAID" | "ALREADY_RECORDED" | "DUPLICATE" | "ON_CANCELLED" | "PAID_BY_HAND";

interface PaymentState {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  stripePaymentIntentId: string | null;
}

export function paymentOutcome(order: PaymentState, paymentIntentId: string): PaymentOutcome {
  if (order.stripePaymentIntentId === paymentIntentId) return "ALREADY_RECORDED";
  if (order.paymentStatus === "UNPAID") return order.status === "CANCELLED" ? "ON_CANCELLED" : "MARK_PAID";
  return order.stripePaymentIntentId === null ? "PAID_BY_HAND" : "DUPLICATE";
}

const NO_REASON = "No reason given.";

export function failureReason(error: { message?: string | null } | null | undefined): string {
  return error?.message || NO_REASON;
}

/** Staff notes on the order history. Each names the Stripe id to search for in the dashboard. */
export const PAYMENT_NOTES = {
  duplicate: (paymentIntentId: string) =>
    `Second payment ${paymentIntentId} received for an order that is already paid. Refund it in Stripe.`,
  onCancelled: (paymentIntentId: string) =>
    `Payment ${paymentIntentId} received for a cancelled order. Refund it in Stripe.`,
  paidByHand: (paymentIntentId: string) =>
    `Stripe payment ${paymentIntentId} received after the order was marked paid by hand. Check it isn't a second payment.`,
  failed: (paymentIntentId: string, reason: string) => `Payment ${paymentIntentId} failed: ${reason}`,
  expired: (sessionId: string) => `Stripe payment page ${sessionId} closed without payment.`,
};

/**
 * What a retried checkout does with the order's saved Stripe page, so one
 * order never has two payable pages open. See docs/PAYMENTS.md §4.
 */
export type SavedSessionAction = "COMPLETE" | "REUSE" | "EXPIRE_AND_REPLACE" | "REPLACE";

export function savedSessionAction(
  session: Pick<Stripe.Checkout.Session, "status" | "url" | "expires_at">,
  now: Date,
): SavedSessionAction {
  if (session.status === "complete") return "COMPLETE";
  if (session.status !== "open") return "REPLACE";
  const remaining = session.expires_at * MS_PER_SECOND - now.getTime();
  const enoughTime = remaining >= CHECKOUT_SESSION_REUSE_MIN_MINUTES * MS_PER_MINUTE;
  return session.url && enoughTime ? "REUSE" : "EXPIRE_AND_REPLACE";
}
