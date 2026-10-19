import "server-only";

import Stripe from "stripe";
import { ServiceError } from "@/lib/api/api-response";
import { appUrl } from "@/lib/app-url";
import { CHECKOUT_SUCCESS_PAGE_PATH, PAYMENT_CANCELLED_VALUE, PAYMENT_RESULT_PARAM } from "@/lib/constants";
import { stripeWebhookEnv } from "@/lib/env";
import { stripeClient } from "@/lib/stripe";
import {
  PAYMENT_NOTES,
  checkoutSessionParams,
  failureReason,
  isPaidFor,
  metadataOrderNumber,
  savedSessionAction,
  sessionPaymentIntentId,
  type PaymentOutcome,
} from "@/lib/stripe-checkout";
import {
  addPaymentNote,
  claimCheckoutSession,
  getCheckoutSessionId,
  getOrderDetail,
  recordStripePayment,
} from "@/services/order.service";
import type { OrderDetail, PlacedOrder } from "@/types/order";

/**
 * Card and Apple Pay through Stripe Checkout, Stripe's hosted payment page.
 * See docs/PAYMENTS.md.
 */

const MESSAGE_NOT_CONFIGURED = "Card payments aren't available right now. Please try again later.";
const MESSAGE_PAGE_FAILED = "We couldn't open the payment page. Please try again.";
const MESSAGE_CHECK_FAILED = "We couldn't check your payment. Please try again.";
const MESSAGE_PAYMENT_NOT_FOUND = "We couldn't find that payment.";
const MESSAGE_WEBHOOK_NOT_CONFIGURED = "Stripe webhooks are not configured.";
const MESSAGE_BAD_SIGNATURE = "Invalid Stripe signature.";
const ASYNC_PAYMENT_FAILED = "The bank did not confirm the payment.";
const STRIPE_RESOURCE_MISSING = "resource_missing";
const BAD_GATEWAY = 502;
/** A checkout that loses the race to save its page tries once more, reusing the winner's page. */
const SESSION_CLAIM_ATTEMPTS = 2;

function stripeOrUnavailable(): Stripe {
  try {
    return stripeClient();
  } catch (error) {
    console.error("Stripe is not configured", error);
    throw new ServiceError("NOT_CONFIGURED", MESSAGE_NOT_CONFIGURED, 503);
  }
}

function paymentNotFound() {
  return new ServiceError("NOT_FOUND", MESSAGE_PAYMENT_NOT_FOUND, 404);
}

async function returnUrls(number: string) {
  const query = new URLSearchParams({ order: number });
  const success = await appUrl(`${CHECKOUT_SUCCESS_PAGE_PATH}?${query}`);
  query.set(PAYMENT_RESULT_PARAM, PAYMENT_CANCELLED_VALUE);
  const cancel = await appUrl(`${CHECKOUT_SUCCESS_PAGE_PATH}?${query}`);
  return { success, cancel };
}

function pageFailed() {
  return new ServiceError("INTERNAL", MESSAGE_PAGE_FAILED, BAD_GATEWAY);
}

/** A new Stripe payment page for the order, with a url to send the customer to. */
async function createSession(stripe: Stripe, order: OrderDetail): Promise<Stripe.Checkout.Session & { url: string }> {
  const params = checkoutSessionParams(
    { number: order.number, total: order.totals.total, email: order.contact.email },
    await returnUrls(order.number),
    new Date(),
  );

  try {
    const session = await stripe.checkout.sessions.create(params);
    if (session.url) return { ...session, url: session.url };
    console.error(`Stripe session ${session.id} for ${order.number} has no url`);
  } catch (error) {
    console.error(`Stripe session for ${order.number} failed`, error);
  }
  throw pageFailed();
}

/**
 * Closes a payment page so it can no longer be paid. Stripe refuses to close
 * one that was just paid; then the page is read back and returned as complete.
 * A page still open after that is a 502, so a second page is never opened.
 */
async function closeSession(stripe: Stripe, sessionId: string): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.expire(sessionId);
  } catch (error) {
    console.warn(`Stripe session ${sessionId} could not be closed`, error);
  }
  const session = await retrieveSession(stripe, sessionId);
  if (session.status === "open") throw pageFailed();
  return session;
}

async function retrieveSession(stripe: Stripe, sessionId: string): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === STRIPE_RESOURCE_MISSING) throw paymentNotFound();
    console.error(`Stripe session ${sessionId} could not be read`, error);
    throw new ServiceError("INTERNAL", MESSAGE_CHECK_FAILED, BAD_GATEWAY);
  }
}

/** Outcomes staff must act on are logged too; the note is already on the order history. */
function reportOutcome(outcome: PaymentOutcome, number: string, paymentIntentId: string) {
  if (outcome === "MARK_PAID" || outcome === "ALREADY_RECORDED") return;
  console.error(`Stripe payment ${paymentIntentId} on ${number}: ${outcome}. See the order history.`);
}

async function orderOf(object: { metadata: Stripe.Metadata | null }): Promise<OrderDetail | null> {
  const number = metadataOrderNumber(object);
  return number ? getOrderDetail({ number }) : null;
}

/**
 * A session Stripe reports as paid. When it paid this order in full, records
 * the payment (`recordStripePayment`). Shared by the return page and the webhook.
 */
async function settleSession(session: Stripe.Checkout.Session, order: OrderDetail): Promise<void> {
  if (session.payment_status !== "paid") return;
  const paymentIntentId = sessionPaymentIntentId(session);
  if (!paymentIntentId || !isPaidFor(session, { number: order.number, total: order.totals.total })) {
    console.error(`Stripe session ${session.id} paid ${session.amount_total} ${session.currency}, not ${order.number}'s total`);
    return;
  }
  reportOutcome(await recordStripePayment(order.number, paymentIntentId), order.number, paymentIntentId);
}

/**
 * The customer is back from Stripe with a session id. Asks Stripe whether that
 * session paid and settles it, then returns the order either way. Holding the
 * session id is what lets a guest see it.
 */
export async function confirmCheckoutPayment(sessionId: string): Promise<OrderDetail> {
  const session = await retrieveSession(stripeOrUnavailable(), sessionId);
  const order = await orderOf(session);
  if (!order) throw paymentNotFound();
  await settleSession(session, order);
  return (await getOrderDetail({ number: order.number })) ?? order;
}

/** The saved page, or null when Stripe no longer has it (for example after switching test accounts). */
async function savedSession(stripe: Stripe, sessionId: string): Promise<Stripe.Checkout.Session | null> {
  try {
    return await retrieveSession(stripe, sessionId);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

/** The saved page was paid (or a bank payment is processing): settle it and send no new page. */
async function alreadyCompleted(session: Stripe.Checkout.Session, order: OrderDetail): Promise<PlacedOrder> {
  await settleSession(session, order);
  return { order: (await getOrderDetail({ number: order.number })) ?? order, paymentUrl: null };
}

/**
 * A card or Apple Pay order awaiting payment: where to send the customer.
 * Reuses the order's open Stripe page, so a retried checkout never leaves two
 * payable pages for one order (`savedSessionAction`). Otherwise opens a new
 * page and saves it only if no parallel checkout saved one first; the loser
 * closes its page and takes the winner's. See docs/PAYMENTS.md §4.
 */
export async function startOnlinePayment(order: OrderDetail, attempt = 1): Promise<PlacedOrder> {
  const stripe = stripeOrUnavailable();
  const savedId = await getCheckoutSessionId(order.number);
  const saved = savedId ? await savedSession(stripe, savedId) : null;

  if (saved) {
    const action = savedSessionAction(saved, new Date());
    if (action === "REUSE") return { order, paymentUrl: saved.url };
    if (action === "COMPLETE") return alreadyCompleted(saved, order);
    if (action === "EXPIRE_AND_REPLACE") {
      const closed = await closeSession(stripe, saved.id);
      if (closed.status === "complete") return alreadyCompleted(closed, order);
    }
  }

  const session = await createSession(stripe, order);
  if (await claimCheckoutSession(order.number, savedId, session.id)) return { order, paymentUrl: session.url };

  await closeSession(stripe, session.id);
  if (attempt >= SESSION_CLAIM_ATTEMPTS) throw pageFailed();
  return startOnlinePayment(order, attempt + 1);
}

/* ---------- webhooks ---------- */

function invalidSignature() {
  return new ServiceError("VALIDATION", MESSAGE_BAD_SIGNATURE, 400);
}

/** Checks the `Stripe-Signature` header against the raw body. Anything unsigned or altered is a 400. */
export function verifyWebhookEvent(payload: string, signature: string | null): Stripe.Event {
  let secret: string;
  try {
    secret = stripeWebhookEnv().STRIPE_WEBHOOK_SECRET;
  } catch (error) {
    console.error("Stripe webhooks are not configured", error);
    throw new ServiceError("NOT_CONFIGURED", MESSAGE_WEBHOOK_NOT_CONFIGURED, 503);
  }
  if (!signature) throw invalidSignature();

  try {
    return stripeOrUnavailable().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.warn("Stripe webhook signature rejected", error instanceof Error ? error.message : error);
    throw invalidSignature();
  }
}

/** An event for an order we don't have (a dashboard test event, another site) is acknowledged and skipped. */
function skip(event: Stripe.Event) {
  console.warn(`Stripe event ${event.id} (${event.type}) has no matching order; skipped`);
}

async function noteOn(event: Stripe.Event, number: string | null, note: string, whileUnpaid = false) {
  if (!number) return skip(event);
  try {
    await addPaymentNote(number, note, { whileUnpaid });
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") return skip(event);
    throw error;
  }
}

/**
 * One verified event. Throwing makes the route answer 500, so Stripe retries
 * (for up to 3 days). Every branch is safe to run twice. See docs/PAYMENTS.md §6.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const order = await orderOf(session);
      if (!order) return skip(event);
      return settleSession(session, order);
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      const reference = sessionPaymentIntentId(session) ?? session.id;
      return noteOn(event, metadataOrderNumber(session), PAYMENT_NOTES.failed(reference, ASYNC_PAYMENT_FAILED));
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      return noteOn(event, metadataOrderNumber(session), PAYMENT_NOTES.expired(session.id), true);
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object;
      const note = PAYMENT_NOTES.failed(intent.id, failureReason(intent.last_payment_error));
      return noteOn(event, metadataOrderNumber(intent), note);
    }
    default:
      return;
  }
}
