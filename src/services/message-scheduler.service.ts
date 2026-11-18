import "server-only";

import { appUrl } from "@/lib/app-url";
import {
  ABANDONED_CHECKOUT_AFTER_HOURS,
  ABANDONED_CHECKOUT_COOLDOWN_DAYS,
  ABANDONED_CHECKOUT_MAX_AGE_DAYS,
  CART_PAGE_PATH,
  ENTITLEMENT_REMINDER_DAYS_BEFORE_END,
  MESSAGE_SWEEP_BATCH,
  MS_PER_DAY,
  MS_PER_HOUR,
  REVIEW_REQUEST_AFTER_DAYS,
  REVIEW_REQUEST_MAX_AGE_DAYS,
  WARRANTY_EXPIRY_NOTICE_DAYS_BEFORE_END,
  WARRANTY_FOLLOW_UP_AFTER_DAYS,
  WARRANTY_FOLLOW_UP_MAX_AGE_DAYS,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  abandonedCheckoutMessage,
  entitlementReminderMessage,
  reviewRequestMessage,
  warrantyExpiryNoticeMessage,
  warrantyFollowUpMessage,
} from "@/lib/email/message-templates";
import { dedupeKey } from "@/lib/messaging";
import {
  customerSelect,
  entitlementLines,
  loadClaim,
  orderLink,
  warrantyDate,
} from "@/services/customer-email.service";
import { dispatchEmail, settledRefs } from "@/services/message.service";
import { sweepCampaignMessages, sweepReleaseSequence } from "@/services/release-message.service";

/**
 * Sends the messages that depend on time passing, from live records: a cart
 * left behind, an order delivered a week ago, a warranty nearing its end, a
 * returned repair. Each sweep looks at a bounded window, sends at most
 * `MESSAGE_SWEEP_BATCH`, and records every send, so running twice never sends
 * twice. Started on a timer by `src/instrumentation.ts`. See docs/MESSAGING.md.
 */

const CART_LINK_LABEL = "Return to my cart";

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * MS_PER_DAY);
const daysAhead = (now: Date, days: number) => new Date(now.getTime() + days * MS_PER_DAY);
const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * MS_PER_HOUR);

/* ---------- abandoned checkout ---------- */

/** Signed in customers with a verified email who left items in the cart, once per cooldown. */
async function sweepAbandonedCheckouts(now: Date) {
  const handled = await settledRefs("ABANDONED_CHECKOUT", daysAgo(now, ABANDONED_CHECKOUT_COOLDOWN_DAYS));
  const carts = await prisma.cart.findMany({
    where: {
      id: { notIn: handled },
      userId: { not: null },
      updatedAt: { gte: daysAgo(now, ABANDONED_CHECKOUT_MAX_AGE_DAYS), lte: hoursAgo(now, ABANDONED_CHECKOUT_AFTER_HOURS) },
      items: { some: {} },
      user: { state: "ACTIVE", role: "CUSTOMER", emailVerifiedAt: { not: null } },
    },
    select: {
      id: true,
      userId: true,
      updatedAt: true,
      user: { select: { email: true, fullName: true } },
      items: { select: { quantity: true, variant: { select: { product: { select: { name: true } } } } } },
    },
    orderBy: { updatedAt: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });

  for (const cart of carts) {
    if (!cart.user || !cart.userId) continue;
    const ordered = await prisma.order.count({ where: { userId: cart.userId, createdAt: { gte: cart.updatedAt } } });
    if (ordered > 0) continue;

    const { user } = cart;
    await dispatchEmail({
      trigger: "ABANDONED_CHECKOUT",
      recipient: user.email,
      userId: cart.userId,
      refId: cart.id,
      refLabel: "Cart left behind",
      dedupeKey: dedupeKey("ABANDONED_CHECKOUT", cart.id, cart.updatedAt.getTime()),
      build: async () =>
        abandonedCheckoutMessage({
          name: user.fullName,
          url: await appUrl(CART_PAGE_PATH),
          linkLabel: CART_LINK_LABEL,
          lines: cart.items.map((item) => ({ name: item.variant.product.name, quantity: item.quantity })),
        }),
    });
  }
}

/* ---------- review request ---------- */

/** A week after delivery, for orders with no return raised. */
async function sweepReviewRequests(now: Date) {
  const handled = await settledRefs("REVIEW_REQUEST", daysAgo(now, REVIEW_REQUEST_MAX_AGE_DAYS));
  const orders = await prisma.order.findMany({
    where: {
      number: { notIn: handled },
      status: "DELIVERED",
      deliveredAt: { gte: daysAgo(now, REVIEW_REQUEST_MAX_AGE_DAYS), lte: daysAgo(now, REVIEW_REQUEST_AFTER_DAYS) },
      returns: { none: {} },
    },
    select: { ...customerSelect, items: { select: { productName: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { deliveredAt: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });

  for (const order of orders) {
    await dispatchEmail({
      trigger: "REVIEW_REQUEST",
      recipient: order.email,
      userId: order.userId,
      refId: order.number,
      refLabel: `Order ${order.number}`,
      dedupeKey: dedupeKey("REVIEW_REQUEST", order.number),
      build: async () =>
        reviewRequestMessage({
          ...(await orderLink(order)),
          name: order.firstName,
          number: order.number,
          products: order.items.map((item) => item.productName),
        }),
    });
  }
}

/* ---------- warranty and entitlements ---------- */

const warrantyItemSelect = {
  id: true,
  productName: true,
  warrantyEndsAt: true,
  addOns: { select: { name: true, extraWarrantyMonths: true } },
  order: { select: customerSelect },
} as const;

/** Delivered lines whose warranty ends within the notice period. */
async function sweepWarrantyExpiry(now: Date) {
  const handled = await settledRefs("WARRANTY_EXPIRY_NOTICE", daysAgo(now, WARRANTY_EXPIRY_NOTICE_DAYS_BEFORE_END));
  const items = await prisma.orderItem.findMany({
    where: {
      id: { notIn: handled },
      order: { status: "DELIVERED" },
      warrantyEndsAt: { gt: now, lte: daysAhead(now, WARRANTY_EXPIRY_NOTICE_DAYS_BEFORE_END) },
    },
    select: warrantyItemSelect,
    orderBy: { warrantyEndsAt: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });

  for (const item of items) {
    const endsAt = item.warrantyEndsAt;
    if (!endsAt) continue;
    await dispatchEmail({
      trigger: "WARRANTY_EXPIRY_NOTICE",
      recipient: item.order.email,
      userId: item.order.userId,
      refId: item.id,
      refLabel: `Order ${item.order.number}`,
      dedupeKey: dedupeKey("WARRANTY_EXPIRY_NOTICE", item.id, endsAt.getTime()),
      build: async () =>
        warrantyExpiryNoticeMessage({
          ...(await orderLink(item.order)),
          name: item.order.firstName,
          number: item.order.number,
          product: item.productName,
          warrantyEndsAt: warrantyDate(endsAt),
          daysLeft: Math.max(1, Math.round((endsAt.getTime() - now.getTime()) / MS_PER_DAY)),
        }),
    });
  }
}

/** Delivered lines with extra-cover add-ons whose cover ends within the reminder period. */
async function sweepEntitlementReminders(now: Date) {
  const handled = await settledRefs("ENTITLEMENT_REMINDER", daysAgo(now, ENTITLEMENT_REMINDER_DAYS_BEFORE_END));
  const items = await prisma.orderItem.findMany({
    where: {
      id: { notIn: handled },
      order: { status: "DELIVERED" },
      warrantyEndsAt: { gt: now, lte: daysAhead(now, ENTITLEMENT_REMINDER_DAYS_BEFORE_END) },
      addOns: { some: { extraWarrantyMonths: { gt: 0 } } },
    },
    select: warrantyItemSelect,
    orderBy: { warrantyEndsAt: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });

  for (const item of items) {
    const endsAt = item.warrantyEndsAt;
    if (!endsAt) continue;
    await dispatchEmail({
      trigger: "ENTITLEMENT_REMINDER",
      recipient: item.order.email,
      userId: item.order.userId,
      refId: item.id,
      refLabel: `Order ${item.order.number}`,
      dedupeKey: dedupeKey("ENTITLEMENT_REMINDER", item.id, endsAt.getTime()),
      build: async () =>
        entitlementReminderMessage({
          ...(await orderLink(item.order)),
          name: item.order.firstName,
          number: item.order.number,
          lines: entitlementLines([item]),
        }),
    });
  }
}

/** A repaired or replaced device went back to the customer a while ago. */
async function sweepWarrantyFollowUps(now: Date) {
  const handled = await settledRefs("WARRANTY_FOLLOW_UP", daysAgo(now, WARRANTY_FOLLOW_UP_MAX_AGE_DAYS));
  const claims = await prisma.warrantyClaim.findMany({
    where: {
      number: { notIn: handled },
      status: "RETURNED_TO_CUSTOMER",
      updatedAt: { gte: daysAgo(now, WARRANTY_FOLLOW_UP_MAX_AGE_DAYS), lte: daysAgo(now, WARRANTY_FOLLOW_UP_AFTER_DAYS) },
    },
    select: { number: true },
    orderBy: { updatedAt: "asc" },
    take: MESSAGE_SWEEP_BATCH,
  });

  for (const { number } of claims) {
    const { customer, input } = await loadClaim(number);
    await dispatchEmail({
      trigger: "WARRANTY_FOLLOW_UP",
      recipient: customer.email,
      userId: customer.userId,
      refId: number,
      refLabel: `Warranty claim ${number}`,
      dedupeKey: dedupeKey("WARRANTY_FOLLOW_UP", number),
      build: async () => warrantyFollowUpMessage(input),
    });
  }
}

/* ---------- the run ---------- */

const SWEEPS: { name: string; run: (now: Date) => Promise<void> }[] = [
  { name: "release sequence", run: sweepReleaseSequence },
  { name: "campaign messages", run: sweepCampaignMessages },
  { name: "abandoned checkouts", run: sweepAbandonedCheckouts },
  { name: "review requests", run: sweepReviewRequests },
  { name: "warranty expiry notices", run: sweepWarrantyExpiry },
  { name: "entitlement reminders", run: sweepEntitlementReminders },
  { name: "warranty follow-ups", run: sweepWarrantyFollowUps },
];

let running = false;

/**
 * One pass over every timed message. A failing sweep is logged and the others
 * still run; a pass that starts while another is running does nothing.
 */
export async function runScheduledMessages(now: Date = new Date()): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (const sweep of SWEEPS) {
      try {
        await sweep.run(now);
      } catch (error) {
        console.error(`message sweep "${sweep.name}" failed`, error);
      }
    }
  } finally {
    running = false;
  }
}
