import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { createRandomToken, hashToken } from "@/lib/auth/tokens";
import { clearGuestCartCookie, readGuestTokenHash, type CartOwner } from "@/lib/cart-owner";
import {
  isProductVisible,
  lineIssues,
  maxLineQuantity,
  pickLineImage,
  planCartMerge,
  quantityProblem,
  unionIds,
  type MergeLine,
  type QuantityCheck,
  type QuantityProblem,
} from "@/lib/cart-rules";
import { toShopCondition, toShopGrade } from "@/lib/catalogue";
import {
  CART_COOKIE_MAX_AGE_SECONDS,
  CART_MAX_LINES,
  CART_MAX_LINE_QUANTITY,
  MAX_PRODUCT_ADD_ONS,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { DELIVERY_METHOD_LABELS } from "@/lib/delivery";
import { formatMoney } from "@/lib/money";
import { lineTotal } from "@/lib/pricing/arithmetic";
import { COUPON_MESSAGES, COUPON_MINIMUM_TOKEN } from "@/lib/pricing/coupon";
import { priceCart } from "@/lib/pricing/price-cart";
import type { CartPricing, CouponRejection, CouponRule, PricingLine } from "@/lib/pricing/types";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import {
  OFFERED_ADD_ON_ORDER,
  PUBLISHED,
  offeredAddOnWhere,
  shopAddOnSelect,
  toShopAddOn,
} from "@/services/catalogue.service";
import { findDeliveryZone } from "@/services/delivery-zone.service";
import {
  BLOCKING_CART_LINE_ISSUES,
  type AppliedCoupon,
  type Cart,
  type CartLine,
  type CartQuote,
  type DeliveryOption,
  type OfferedAddOn,
} from "@/types/cart";
import type {
  addCartItemSchema,
  cartQuoteQuerySchema,
  updateCartItemSchema,
} from "@/validators/cart.validator";

type Tx = Prisma.TransactionClient;
type Owner = NonNullable<CartOwner>;
type AddCartItemData = z.output<typeof addCartItemSchema>;
type UpdateCartItemData = z.output<typeof updateCartItemSchema>;
type CartQuoteData = z.output<typeof cartQuoteQuerySchema>;

const MS_PER_SECOND = 1000;
const OFFERED_ADD_ONS_QUERY_LIMIT = MAX_PRODUCT_ADD_ONS * CART_MAX_LINES;

const MESSAGE_ITEM_UNAVAILABLE = "This item is no longer available.";
const MESSAGE_OUT_OF_STOCK = "This item is out of stock.";
const MESSAGE_LINE_CAP = `You can add up to ${CART_MAX_LINE_QUANTITY} of this item.`;
const MESSAGE_CART_FULL = "Your cart is full.";
const MESSAGE_LINE_NOT_FOUND = "That item isn't in your cart.";
const MESSAGE_ADD_ON_UNAVAILABLE = "One of the chosen add-ons isn't available for this item.";
const MESSAGE_EMPTY_CART = "Add something to your cart first.";
const MESSAGE_NO_DELIVERY = "We don't deliver to that emirate yet.";

const couponSelect = {
  id: true,
  code: true,
  description: true,
  type: true,
  value: true,
  minOrderAmount: true,
  startsAt: true,
  endsAt: true,
  active: true,
  usageLimit: true,
  perCustomerLimit: true,
  redemptionCount: true,
  appliesToAll: true,
  products: { select: { productId: true } },
  categories: { select: { categoryId: true } },
} satisfies Prisma.CouponSelect;

type CouponRow = Prisma.CouponGetPayload<{ select: typeof couponSelect }>;

const cartSelect = {
  id: true,
  coupon: { select: couponSelect },
  items: {
    select: {
      id: true,
      quantity: true,
      seenUnitPrice: true,
      variant: {
        select: {
          id: true,
          sku: true,
          storage: true,
          colour: true,
          condition: true,
          grade: true,
          price: true,
          compareAtPrice: true,
          stock: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              categoryId: true,
              warrantyMonths: true,
              brand: { select: { name: true } },
              category: {
                select: { status: true, parentId: true, parent: { select: { status: true } } },
              },
              images: {
                select: { mediaId: true, alt: true, colour: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
      addOns: {
        select: {
          seenPrice: true,
          addOn: { select: { id: true, name: true, kind: true, price: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: CART_MAX_LINES,
  },
} satisfies Prisma.CartSelect;

type CartRow = Prisma.CartGetPayload<{ select: typeof cartSelect }>;
export type CartItemRow = CartRow["items"][number];

export interface PricedCartLine {
  item: CartItemRow;
  line: CartLine;
  pricing: PricingLine;
  imageId: string | null;
}

export interface PricedCart {
  cartId: string;
  coupon: { id: string; code: string } | null;
  lines: PricedCartLine[];
  pricing: CartPricing;
  cart: Cart;
}

const offeredSelect = {
  ...shopAddOnSelect,
  appliesToAll: true,
  categories: { select: { categoryId: true } },
} satisfies Prisma.AddOnSelect;

type OfferedRow = Prisma.AddOnGetPayload<{ select: typeof offeredSelect }>;

const mergeLineSelect = {
  id: true,
  variantId: true,
  quantity: true,
  addOns: { select: { addOnId: true, seenPrice: true } },
} satisfies Prisma.CartItemSelect;

type MergeLineRow = Prisma.CartItemGetPayload<{ select: typeof mergeLineSelect }>;

/* ---------- helpers ---------- */

function ownerWhere(owner: Owner) {
  return owner.kind === "user" ? { userId: owner.userId } : { guestTokenHash: owner.tokenHash };
}

function categoryIdsOf(product: { categoryId: string; category: { parentId: string | null } }) {
  return product.category.parentId
    ? [product.categoryId, product.category.parentId]
    : [product.categoryId];
}

function lineNotFound() {
  return new ServiceError("NOT_FOUND", MESSAGE_LINE_NOT_FOUND, 404);
}

function quantityMessage(problem: QuantityProblem, stock: number) {
  switch (problem) {
    case "UNAVAILABLE":
      return MESSAGE_ITEM_UNAVAILABLE;
    case "OUT_OF_STOCK":
      return MESSAGE_OUT_OF_STOCK;
    case "INSUFFICIENT_STOCK":
      return `Only ${stock} left in stock.`;
    case "LINE_CAP":
      return MESSAGE_LINE_CAP;
  }
}

function assertQuantity(check: QuantityCheck) {
  const problem = quantityProblem(check);
  if (!problem) return;
  const message = quantityMessage(problem, check.stock);
  throw new ServiceError("CONFLICT", message, 409, { quantity: [message] });
}

function couponRejected(message: string) {
  return new ServiceError("VALIDATION", message, 422, { code: [message] });
}

function couponMessage(reason: CouponRejection, minOrderAmount: number) {
  return COUPON_MESSAGES[reason].replace(COUPON_MINIMUM_TOKEN, formatMoney(minOrderAmount));
}

function toCouponRule({ products, categories, ...rule }: CouponRow): CouponRule {
  return {
    ...rule,
    productIds: products.map((link) => link.productId),
    categoryIds: categories.map((link) => link.categoryId),
  };
}

function toOfferedAddOn(row: OfferedRow): OfferedAddOn {
  const { id, label, note, price, kind } = toShopAddOn(row);
  return { id, label, note, price, kind };
}

function offeredForLine(rows: OfferedRow[], categoryIds: string[]) {
  return rows
    .filter(
      (row) =>
        row.appliesToAll || row.categories.some((link) => categoryIds.includes(link.categoryId)),
    )
    .slice(0, MAX_PRODUCT_ADD_ONS)
    .map(toOfferedAddOn);
}

async function offeredAddOnsFor(db: Tx, categoryIds: string[]): Promise<OfferedRow[]> {
  if (categoryIds.length === 0) return [];
  return db.addOn.findMany({
    where: offeredAddOnWhere(categoryIds),
    select: {
      ...offeredSelect,
      categories: { where: { categoryId: { in: categoryIds } }, select: { categoryId: true } },
    },
    orderBy: OFFERED_ADD_ON_ORDER,
    take: OFFERED_ADD_ONS_QUERY_LIMIT,
  });
}

async function assertAddOnsOffered(addOnIds: string[], categoryIds: string[]) {
  if (addOnIds.length === 0) return;
  const offered = await prisma.addOn.findMany({
    where: offeredAddOnWhere(categoryIds),
    select: { id: true },
    orderBy: OFFERED_ADD_ON_ORDER,
    take: MAX_PRODUCT_ADD_ONS,
  });
  const ids = new Set(offered.map((addOn) => addOn.id));
  if (addOnIds.some((id) => !ids.has(id))) {
    throw new ServiceError("VALIDATION", MESSAGE_ADD_ON_UNAVAILABLE, 422, {
      addOnIds: [MESSAGE_ADD_ON_UNAVAILABLE],
    });
  }
}

/* ---------- mapping ---------- */

function buildLine(item: CartItemRow, offeredRows: OfferedRow[]): PricedCartLine {
  const { variant } = item;
  const { product } = variant;
  const categoryIds = categoryIdsOf(product);
  const offeredAddOns = offeredForLine(offeredRows, categoryIds);
  const offeredIds = new Set(offeredAddOns.map((addOn) => addOn.id));
  const visible = isProductVisible(product);

  const addOns = item.addOns.map((link) => ({
    id: link.addOn.id,
    label: link.addOn.name,
    price: link.addOn.price,
    seenPrice: link.seenPrice,
    available: offeredIds.has(link.addOn.id),
  }));

  const pricing: PricingLine = {
    key: item.id,
    productId: product.id,
    categoryIds,
    unitPrice: variant.price,
    addOnUnitPrice: addOns
      .filter((addOn) => addOn.available)
      .reduce((sum, addOn) => sum + addOn.price, 0),
    quantity: item.quantity,
    purchasable: visible && variant.stock > 0,
  };

  const image = pickLineImage(product.images, variant.colour);
  const line: CartLine = {
    id: item.id,
    variantId: variant.id,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    brand: product.brand.name,
    imageUrl: imageUrlOrNull(image?.mediaId ?? null),
    imageAlt: image?.alt || `${product.brand.name} ${product.name}`,
    condition: toShopCondition(variant.condition),
    grade: variant.grade ? toShopGrade(variant.grade) : null,
    storage: variant.storage,
    colour: variant.colour,
    quantity: item.quantity,
    maxQuantity: maxLineQuantity(variant.stock),
    unitPrice: variant.price,
    compareAtPrice: variant.compareAtPrice,
    previousUnitPrice: variant.price !== item.seenUnitPrice ? item.seenUnitPrice : null,
    addOns: addOns.map(({ id, label, price, available }) => ({ id, label, price, available })),
    offeredAddOns,
    lineTotal: lineTotal(pricing),
    issues: lineIssues({
      visible,
      stock: variant.stock,
      quantity: item.quantity,
      unitPrice: variant.price,
      seenUnitPrice: item.seenUnitPrice,
      addOns,
    }),
  };

  return { item, line, pricing, imageId: image?.mediaId ?? null };
}

function totalsOf(pricing: CartPricing) {
  const { subtotal, discount, delivery, total, vatIncluded, vatRatePercent } = pricing;
  return { subtotal, discount, delivery, total, vatIncluded, vatRatePercent };
}

function appliedCoupon(row: CouponRow, pricing: CartPricing): AppliedCoupon {
  const result = pricing.coupon;
  return {
    code: row.code,
    description: row.description,
    valid: result?.ok === true,
    message: result && !result.ok ? couponMessage(result.reason, row.minOrderAmount) : null,
  };
}

function emptyCart(couponsAllowed: boolean, deliveryFee: number | null): Cart {
  const pricing = priceCart({ lines: [], coupon: null, deliveryFee, now: new Date() });
  return {
    id: null,
    items: [],
    itemCount: 0,
    coupon: null,
    totals: totalsOf(pricing),
    canCheckout: false,
    couponsAllowed,
  };
}

interface PriceOptions {
  deliveryFee: number | null;
  now: Date;
}

function priceRow(
  row: CartRow,
  owner: Owner,
  offeredRows: OfferedRow[],
  customerRedemptions: number,
  { deliveryFee, now }: PriceOptions,
): PricedCart {
  const lines = row.items.map((item) => buildLine(item, offeredRows));
  const couponRow = owner.kind === "user" ? row.coupon : null;
  const pricing = priceCart({
    lines: lines.map((entry) => entry.pricing),
    coupon: couponRow ? { rule: toCouponRule(couponRow), customerRedemptions } : null,
    deliveryFee,
    now,
  });
  const items = lines.map((entry) => entry.line);

  const cart: Cart = {
    id: row.id,
    items,
    itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
    coupon: couponRow ? appliedCoupon(couponRow, pricing) : null,
    totals: totalsOf(pricing),
    canCheckout:
      items.length > 0 &&
      items.every((line) => !line.issues.some((issue) => BLOCKING_CART_LINE_ISSUES.includes(issue))),
    couponsAllowed: owner.kind === "user",
  };

  const coupon = couponRow ? { id: couponRow.id, code: couponRow.code } : null;
  return { cartId: row.id, coupon, lines, pricing, cart };
}

function lineCategoryIds(row: CartRow) {
  return [...new Set(row.items.flatMap((item) => categoryIdsOf(item.variant.product)))];
}

async function loadCartRow(owner: Owner, db: Tx = prisma) {
  return db.cart.findUnique({ where: ownerWhere(owner), select: cartSelect });
}

export function countRedemptions(db: Tx, couponId: string, userId: string): Promise<number> {
  return db.couponRedemption.count({ where: { couponId, userId } });
}

export async function loadPricedCart(db: Tx, owner: Owner, options: PriceOptions): Promise<PricedCart | null> {
  const row = await loadCartRow(owner, db);
  if (!row) return null;

  const offeredRows = row.items.length > 0 ? await offeredAddOnsFor(db, lineCategoryIds(row)) : [];
  const customerRedemptions =
    owner.kind === "user" && row.coupon ? await countRedemptions(db, row.coupon.id, owner.userId) : 0;
  return priceRow(row, owner, offeredRows, customerRedemptions, options);
}

export async function lockCart(tx: Tx, owner: Owner, now: Date): Promise<boolean> {
  const { count } = await tx.cart.updateMany({ where: ownerWhere(owner), data: { updatedAt: now } });
  return count > 0;
}

export async function clearCheckedOutCart(tx: Tx, cartId: string) {
  await tx.cartItem.deleteMany({ where: { cartId } });
  await tx.cart.update({ where: { id: cartId }, data: { couponId: null } });
}

/* ---------- writes ---------- */

async function touchCart(tx: Tx, cartId: string) {
  await tx.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
}

async function sweepStaleGuestCarts(now: Date) {
  const cutoff = new Date(now.getTime() - CART_COOKIE_MAX_AGE_SECONDS * MS_PER_SECOND);
  await prisma.cart.deleteMany({ where: { userId: null, updatedAt: { lt: cutoff } } });
}

async function findOrCreateCart(tx: Tx, owner: Owner): Promise<string> {
  if (owner.kind === "user") {
    const cart = await tx.cart.upsert({
      where: { userId: owner.userId },
      create: { userId: owner.userId },
      update: {},
      select: { id: true },
    });
    return cart.id;
  }

  const existing = await tx.cart.findUnique({
    where: { guestTokenHash: owner.tokenHash },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await tx.cart.create({
    data: { guestTokenHash: owner.tokenHash },
    select: { id: true },
  });
  return created.id;
}

async function writeLineAddOns(tx: Tx, cartItemId: string, addOnIds: string[]) {
  await tx.cartItemAddOn.deleteMany({ where: { cartItemId } });
  if (addOnIds.length === 0) return;

  const current = await tx.addOn.findMany({
    where: { id: { in: addOnIds } },
    select: { id: true, price: true },
  });
  await tx.cartItemAddOn.createMany({
    data: current.map((addOn) => ({ cartItemId, addOnId: addOn.id, seenPrice: addOn.price })),
  });
}

function findPurchasableVariant(variantId: string) {
  return prisma.productVariant.findFirst({
    where: { id: variantId, product: PUBLISHED },
    select: {
      id: true,
      price: true,
      stock: true,
      product: { select: { categoryId: true, category: { select: { parentId: true } } } },
    },
  });
}

function findOwnedLine(owner: Owner, itemId: string) {
  return prisma.cartItem.findFirst({
    where: { id: itemId, cart: ownerWhere(owner) },
    select: {
      id: true,
      cartId: true,
      quantity: true,
      addOns: { select: { addOnId: true } },
      variant: {
        select: {
          price: true,
          stock: true,
          product: {
            select: {
              status: true,
              categoryId: true,
              category: {
                select: { status: true, parentId: true, parent: { select: { status: true } } },
              },
            },
          },
        },
      },
    },
  });
}

/* ---------- reads ---------- */

export async function getCart(owner: CartOwner, deliveryFee: number | null = null): Promise<Cart> {
  if (!owner) return emptyCart(false, deliveryFee);

  const priced = await loadPricedCart(prisma, owner, { deliveryFee, now: new Date() });
  return priced ? priced.cart : emptyCart(owner.kind === "user", deliveryFee);
}

function deliveryOptions(zone: NonNullable<Awaited<ReturnType<typeof findDeliveryZone>>>): DeliveryOption[] {
  return [
    {
      method: "STANDARD",
      label: DELIVERY_METHOD_LABELS.STANDARD,
      fee: zone.standardFee,
      etaMinDays: zone.standardMinDays,
      etaMaxDays: zone.standardMaxDays,
    },
    {
      method: "EXPRESS",
      label: DELIVERY_METHOD_LABELS.EXPRESS,
      fee: zone.expressFee,
      etaMinDays: zone.expressMinDays,
      etaMaxDays: zone.expressMaxDays,
    },
  ];
}

export async function quoteCart(owner: CartOwner, { emirate, method }: CartQuoteData): Promise<CartQuote> {
  const zone = await findDeliveryZone(emirate);
  if (!zone) throw new ServiceError("NOT_FOUND", MESSAGE_NO_DELIVERY, 404);

  const options = deliveryOptions(zone);
  const fee = options.find((option) => option.method === method)?.fee ?? null;
  const cart = await getCart(owner, fee);
  return { cart, emirate, method, options };
}

/* ---------- item mutations ---------- */

export async function addCartItem(
  owner: CartOwner,
  input: AddCartItemData,
): Promise<{ cart: Cart; newGuestToken: string | null }> {
  const variant = await findPurchasableVariant(input.variantId);
  if (!variant) throw new ServiceError("NOT_FOUND", MESSAGE_ITEM_UNAVAILABLE, 404);
  await assertAddOnsOffered(input.addOnIds, categoryIdsOf(variant.product));

  let target: Owner;
  let newGuestToken: string | null = null;
  if (owner) {
    target = owner;
  } else {
    newGuestToken = createRandomToken();
    target = { kind: "guest", tokenHash: hashToken(newGuestToken) };
    await sweepStaleGuestCarts(new Date());
  }

  await prisma.$transaction(async (tx) => {
    const cartId = await findOrCreateCart(tx, target);
    const existing = await tx.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId: variant.id } },
      select: { id: true, quantity: true, addOns: { select: { addOnId: true } } },
    });
    if (!existing && (await tx.cartItem.count({ where: { cartId } })) >= CART_MAX_LINES) {
      throw new ServiceError("CONFLICT", MESSAGE_CART_FULL, 409, { quantity: [MESSAGE_CART_FULL] });
    }

    const current = existing?.quantity ?? 0;
    const quantity = current + input.quantity;
    assertQuantity({ requested: quantity, current, stock: variant.stock, visible: true });

    const lineId = existing
      ? (
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity, seenUnitPrice: variant.price },
            select: { id: true },
          })
        ).id
      : (
          await tx.cartItem.create({
            data: { cartId, variantId: variant.id, quantity, seenUnitPrice: variant.price },
            select: { id: true },
          })
        ).id;

    const addOnIds = unionIds(existing?.addOns.map((link) => link.addOnId) ?? [], input.addOnIds);
    await writeLineAddOns(tx, lineId, addOnIds);
    await touchCart(tx, cartId);
  });

  return { cart: await getCart(target), newGuestToken };
}

export async function updateCartItem(owner: CartOwner, itemId: string, input: UpdateCartItemData) {
  if (!owner) throw lineNotFound();
  const line = await findOwnedLine(owner, itemId);
  if (!line) throw lineNotFound();

  const { product } = line.variant;
  if (input.addOnIds) await assertAddOnsOffered(input.addOnIds, categoryIdsOf(product));

  const quantity = input.quantity ?? line.quantity;
  assertQuantity({
    requested: quantity,
    current: line.quantity,
    stock: line.variant.stock,
    visible: isProductVisible(product),
  });

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.update({
      where: { id: line.id },
      data: { quantity, seenUnitPrice: line.variant.price },
    });
    await writeLineAddOns(tx, line.id, input.addOnIds ?? line.addOns.map((link) => link.addOnId));
    await touchCart(tx, line.cartId);
  });

  return getCart(owner);
}

export async function removeCartItem(owner: CartOwner, itemId: string) {
  if (!owner) throw lineNotFound();
  const line = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: ownerWhere(owner) },
    select: { id: true, cartId: true },
  });
  if (!line) throw lineNotFound();

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { id: line.id } }),
    prisma.cart.update({ where: { id: line.cartId }, data: { updatedAt: new Date() } }),
  ]);
  return getCart(owner);
}

export async function acknowledgeCart(owner: CartOwner) {
  if (!owner) return getCart(owner);
  const row = await loadCartRow(owner);
  if (!row) return getCart(owner);

  const lineUpdates = row.items
    .filter((item) => item.seenUnitPrice !== item.variant.price)
    .map((item) =>
      prisma.cartItem.updateMany({
        where: { id: item.id },
        data: { seenUnitPrice: item.variant.price },
      }),
    );
  const addOnUpdates = row.items.flatMap((item) =>
    item.addOns
      .filter((link) => link.seenPrice !== link.addOn.price)
      .map((link) =>
        prisma.cartItemAddOn.updateMany({
          where: { cartItemId: item.id, addOnId: link.addOn.id },
          data: { seenPrice: link.addOn.price },
        }),
      ),
  );
  if (lineUpdates.length + addOnUpdates.length > 0) {
    await prisma.$transaction([...lineUpdates, ...addOnUpdates]);
  }
  return getCart(owner);
}

/* ---------- coupon ---------- */

export async function applyCartCoupon(userId: string, code: string) {
  const owner: Owner = { kind: "user", userId };
  const row = await loadCartRow(owner);
  if (!row || row.items.length === 0) {
    throw new ServiceError("CONFLICT", MESSAGE_EMPTY_CART, 409);
  }

  const coupon = await prisma.coupon.findUnique({ where: { code }, select: couponSelect });
  if (!coupon) throw couponRejected(COUPON_MESSAGES.INVALID);

  const offeredRows = await offeredAddOnsFor(prisma, lineCategoryIds(row));
  const customerRedemptions = await countRedemptions(prisma, coupon.id, userId);
  const pricing = priceCart({
    lines: row.items.map((item) => buildLine(item, offeredRows).pricing),
    coupon: { rule: toCouponRule(coupon), customerRedemptions },
    deliveryFee: null,
    now: new Date(),
  });
  if (pricing.coupon && !pricing.coupon.ok) {
    throw couponRejected(couponMessage(pricing.coupon.reason, coupon.minOrderAmount));
  }

  await prisma.cart.update({ where: { id: row.id }, data: { couponId: coupon.id } });
  return getCart(owner);
}

export async function removeCartCoupon(userId: string) {
  await prisma.cart.updateMany({ where: { userId }, data: { couponId: null } });
  return getCart({ kind: "user", userId });
}

/* ---------- merge on sign-in ---------- */

function toMergeLines(rows: MergeLineRow[]): MergeLine[] {
  return rows.map((row) => ({
    id: row.id,
    variantId: row.variantId,
    quantity: row.quantity,
    addOnIds: row.addOns.map((link) => link.addOnId),
  }));
}

async function mergeGuestCart(tx: Tx, userId: string, tokenHash: string) {
  const guest = await tx.cart.findUnique({
    where: { guestTokenHash: tokenHash },
    select: {
      id: true,
      items: { select: mergeLineSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }] },
    },
  });
  if (!guest) return;

  const user = await tx.cart.findUnique({
    where: { userId },
    select: { id: true, items: { select: mergeLineSelect } },
  });
  if (!user) {
    await tx.cart.update({
      where: { id: guest.id },
      data: { userId, guestTokenHash: null, couponId: null, updatedAt: new Date() },
    });
    return;
  }

  const plan = planCartMerge(toMergeLines(user.items), toMergeLines(guest.items));
  const guestLines = new Map(guest.items.map((line) => [line.id, line]));

  for (const update of plan.updates) {
    await tx.cartItem.update({ where: { id: update.userLineId }, data: { quantity: update.quantity } });
    const addOns = (guestLines.get(update.guestLineId)?.addOns ?? []).filter((link) =>
      update.addOnIds.includes(link.addOnId),
    );
    if (addOns.length > 0) {
      await tx.cartItemAddOn.createMany({
        data: addOns.map((link) => ({
          cartItemId: update.userLineId,
          addOnId: link.addOnId,
          seenPrice: link.seenPrice,
        })),
        skipDuplicates: true,
      });
    }
  }
  if (plan.moves.length > 0) {
    await tx.cartItem.updateMany({ where: { id: { in: plan.moves } }, data: { cartId: user.id } });
  }
  await tx.cart.delete({ where: { id: guest.id } });
  await touchCart(tx, user.id);
}

export async function adoptGuestCart(userId: string): Promise<void> {
  try {
    const tokenHash = await readGuestTokenHash();
    if (tokenHash) {
      await prisma.$transaction((tx) => mergeGuestCart(tx, userId, tokenHash));
    }
    await clearGuestCartCookie();
  } catch (error) {
    console.error("adoptGuestCart failed", error);
  }
}
