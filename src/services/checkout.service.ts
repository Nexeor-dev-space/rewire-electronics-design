import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError, isUniqueViolation } from "@/lib/api/api-response";
import { appUrl } from "@/lib/app-url";
import { resolveGuestUser } from "@/lib/auth/guest-user";
import type { CartOwner } from "@/lib/cart-owner";
import { ORDER_NUMBER_PREFIX, ORDER_TRACK_PAGE_PATH, REFERENCE_NUMBER_ATTEMPTS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send-email";
import { orderConfirmationMessage } from "@/lib/email/templates";
import { initialStatus } from "@/lib/orders";
import { COUPON_MESSAGES } from "@/lib/pricing/coupon";
import { generateReference } from "@/lib/reference-number";
import { clearCheckedOutCart, loadPricedCart, lockCart, type PricedCart } from "@/services/cart.service";
import { findDeliveryZone } from "@/services/delivery-zone.service";
import { getOrderDetail } from "@/services/order.service";
import type { SessionUser } from "@/types/auth";
import type { OrderDetail } from "@/types/order";
import type { placeOrderSchema } from "@/validators/checkout.validator";

type Tx = Prisma.TransactionClient;
type Owner = NonNullable<CartOwner>;
type PlaceOrderData = z.output<typeof placeOrderSchema>;

interface DeliveryChoice {
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
}

interface PlaceOrderResult {
  order: OrderDetail;
  created: boolean;
}

type TransactionOutcome = { kind: "created"; number: string } | { kind: "replay"; number: string };

const MESSAGE_EMPTY_CART = "Your cart is empty.";
const MESSAGE_CART_CHANGED = "Some items in your cart changed. Review your cart.";
const MESSAGE_PRICE_CHANGED = "Prices changed since you opened checkout. Check the new total.";
const MESSAGE_NO_DELIVERY = "We don't deliver to that emirate yet.";
const MESSAGE_KEY_USED = "This checkout was already used. Refresh the page and try again.";

function conflict(message: string, field?: string) {
  return new ServiceError("CONFLICT", message, 409, field ? { [field]: [message] } : undefined);
}

function stockMessage(productName: string, stock: number) {
  return stock > 0 ? `Only ${stock} left of ${productName}.` : `${productName} is out of stock.`;
}

/* ---------- replay ---------- */

async function findKeyOwner(db: Tx, idempotencyKey: string) {
  return db.order.findUnique({
    where: { idempotencyKey },
    select: { number: true, userId: true, placedAsGuest: true },
  });
}

async function replayFor(db: Tx, idempotencyKey: string, sessionUser: SessionUser | null) {
  const existing = await findKeyOwner(db, idempotencyKey);
  if (!existing) return null;

  const owned = sessionUser ? existing.userId === sessionUser.id : existing.placedAsGuest;
  if (!owned) throw conflict(MESSAGE_KEY_USED);
  return existing.number;
}

/* ---------- the transaction ---------- */

function assertPriced(priced: PricedCart | null, expectedTotal: number): PricedCart {
  if (!priced || priced.lines.length === 0) throw conflict(MESSAGE_EMPTY_CART);
  if (!priced.cart.canCheckout) throw conflict(MESSAGE_CART_CHANGED, "cart");

  const coupon = priced.cart.coupon;
  if (coupon && !coupon.valid) throw conflict(coupon.message ?? COUPON_MESSAGES.INVALID, "code");
  if (priced.pricing.total !== expectedTotal) throw conflict(MESSAGE_PRICE_CHANGED, "expectedTotal");
  return priced;
}

async function takeStock(tx: Tx, priced: PricedCart) {
  const lines = [...priced.lines].sort((a, b) => a.item.variant.id.localeCompare(b.item.variant.id));
  for (const { item } of lines) {
    const { count } = await tx.productVariant.updateMany({
      where: { id: item.variant.id, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (count > 0) continue;

    const current = await tx.productVariant.findUnique({
      where: { id: item.variant.id },
      select: { stock: true },
    });
    throw conflict(stockMessage(item.variant.product.name, current?.stock ?? 0), "cart");
  }
}

async function redeemCoupon(tx: Tx, couponId: string) {
  const { count } = await tx.coupon.updateMany({
    where: {
      id: couponId,
      OR: [{ usageLimit: null }, { redemptionCount: { lt: tx.coupon.fields.usageLimit } }],
    },
    data: { redemptionCount: { increment: 1 } },
  });
  if (count === 0) throw conflict(COUPON_MESSAGES.USAGE_LIMIT_REACHED, "code");
}

function orderItems(priced: PricedCart): Prisma.OrderItemCreateWithoutOrderInput[] {
  return priced.lines.map(({ item, line, pricing, imageId }) => ({
    variant: { connect: { id: item.variant.id } },
    ...(imageId ? { image: { connect: { id: imageId } } } : {}),
    productName: item.variant.product.name,
    productSlug: item.variant.product.slug,
    brandName: item.variant.product.brand.name,
    sku: item.variant.sku,
    storage: item.variant.storage,
    colour: item.variant.colour,
    condition: item.variant.condition,
    grade: item.variant.grade,
    warrantyMonths: item.variant.product.warrantyMonths,
    imageAlt: line.imageAlt,
    unitPrice: pricing.unitPrice,
    addOnUnitPrice: pricing.addOnUnitPrice,
    quantity: pricing.quantity,
    lineTotal: line.lineTotal,
    addOns: {
      create: item.addOns
        .filter((link) => line.addOns.some((addOn) => addOn.id === link.addOn.id && addOn.available))
        .map((link) => ({
          addOn: { connect: { id: link.addOn.id } },
          name: link.addOn.name,
          kind: link.addOn.kind,
          price: link.addOn.price,
        })),
    },
  }));
}

async function placeInTransaction(
  tx: Tx,
  owner: Owner,
  sessionUser: SessionUser | null,
  input: PlaceOrderData,
  delivery: DeliveryChoice,
): Promise<TransactionOutcome> {
  const now = new Date();
  if (!(await lockCart(tx, owner, now))) throw conflict(MESSAGE_EMPTY_CART);

  const replay = await replayFor(tx, input.idempotencyKey, sessionUser);
  if (replay) return { kind: "replay", number: replay };

  const customer = sessionUser
    ? { id: sessionUser.id, email: sessionUser.email, placedAsGuest: false }
    : {
        ...(await resolveGuestUser(tx, {
          email: input.email,
          fullName: `${input.firstName} ${input.lastName}`,
          phone: input.phone,
        })),
        placedAsGuest: true,
      };

  const priced = assertPriced(
    await loadPricedCart(tx, owner, { deliveryFee: delivery.fee, now }),
    input.expectedTotal,
  );
  await takeStock(tx, priced);

  const redeemed = sessionUser && priced.coupon && priced.pricing.coupon?.ok ? priced.coupon : null;
  if (redeemed) await redeemCoupon(tx, redeemed.id);

  const { pricing } = priced;
  const status = initialStatus(input.paymentMethod);
  const order = await tx.order.create({
    data: {
      number: generateReference(ORDER_NUMBER_PREFIX),
      idempotencyKey: input.idempotencyKey,
      user: { connect: { id: customer.id } },
      placedAsGuest: customer.placedAsGuest,
      status,
      paymentMethod: input.paymentMethod,
      email: customer.email,
      phone: input.phone,
      firstName: input.firstName,
      lastName: input.lastName,
      emailOptIn: input.emailOptIn ?? false,
      address1: input.address1,
      address2: input.address2 ?? "",
      city: input.city,
      postalCode: input.postalCode ?? "",
      emirate: input.emirate,
      deliveryMethod: input.deliveryMethod,
      deliveryEtaMinDays: delivery.etaMinDays,
      deliveryEtaMaxDays: delivery.etaMaxDays,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      deliveryFee: pricing.delivery ?? 0,
      total: pricing.total,
      vatIncluded: pricing.vatIncluded,
      vatRatePercent: pricing.vatRatePercent,
      couponCode: redeemed ? redeemed.code : null,
      items: { create: orderItems(priced) },
      events: { create: [{ status }] },
      ...(redeemed
        ? {
            couponRedemption: {
              create: {
                coupon: { connect: { id: redeemed.id } },
                user: { connect: { id: customer.id } },
                discount: pricing.discount,
              },
            },
          }
        : {}),
    },
    select: { number: true },
  });

  await clearCheckedOutCart(tx, priced.cartId);
  return { kind: "created", number: order.number };
}

/* ---------- entry points ---------- */

async function deliveryChoice(input: PlaceOrderData): Promise<DeliveryChoice> {
  const zone = await findDeliveryZone(input.emirate);
  if (!zone) {
    throw new ServiceError("VALIDATION", MESSAGE_NO_DELIVERY, 422, { emirate: [MESSAGE_NO_DELIVERY] });
  }
  return input.deliveryMethod === "EXPRESS"
    ? { fee: zone.expressFee, etaMinDays: zone.expressMinDays, etaMaxDays: zone.expressMaxDays }
    : { fee: zone.standardFee, etaMinDays: zone.standardMinDays, etaMaxDays: zone.standardMaxDays };
}

async function loadPlaced(number: string): Promise<OrderDetail> {
  const order = await getOrderDetail({ number });
  if (!order) throw new Error(`Order ${number} vanished after it was placed`);
  return order;
}

export async function placeOrder(
  owner: CartOwner,
  sessionUser: SessionUser | null,
  input: PlaceOrderData,
): Promise<PlaceOrderResult> {
  if (!owner) throw conflict(MESSAGE_EMPTY_CART);

  const early = await replayFor(prisma, input.idempotencyKey, sessionUser);
  if (early) return { order: await loadPlaced(early), created: false };

  const delivery = await deliveryChoice(input);

  for (let attempt = 1; ; attempt += 1) {
    try {
      const outcome = await prisma.$transaction((tx) =>
        placeInTransaction(tx, owner, sessionUser, input, delivery),
      );
      return { order: await loadPlaced(outcome.number), created: outcome.kind === "created" };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const replay = await replayFor(prisma, input.idempotencyKey, sessionUser);
      if (replay) return { order: await loadPlaced(replay), created: false };
      if (attempt >= REFERENCE_NUMBER_ATTEMPTS) throw error;
    }
  }
}

export async function sendOrderConfirmation(order: OrderDetail): Promise<void> {
  const query = new URLSearchParams({ number: order.number, email: order.contact.email });
  const url = await appUrl(`${ORDER_TRACK_PAGE_PATH}?${query}`);
  await sendEmail({
    to: order.contact.email,
    ...orderConfirmationMessage({
      name: order.contact.firstName,
      url,
      number: order.number,
      total: order.totals.total,
      paymentMethod: order.paymentMethod,
    }),
  });
}
