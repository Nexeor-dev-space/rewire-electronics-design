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
  type MergePlan,
  type QuantityCheck,
  type QuantityProblem,
} from "@/lib/cart-rules";
import { addOnScopeOf, resolveOfferedAddOns, type AddOnScope } from "@/lib/add-on-rules";
import { toShopCondition, toShopGrade } from "@/lib/catalogue";
import {
  CART_COOKIE_MAX_AGE_SECONDS,
  CART_MAX_LINES,
  CART_MAX_LINE_QUANTITY,
  DB_WRITE_TIMEOUT_MS,
  MAX_PRODUCT_ADD_ONS,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { releaseCapLeft, releaseCapMessage, releaseOpenForSale, releaseStatus } from "@/lib/releases";
import { lineTotal } from "@/lib/pricing/arithmetic";
import { campaignPrice, campaignVariantPrice, type CampaignDiscount } from "@/lib/pricing/campaign";
import { COUPON_MESSAGES, COUPON_MINIMUM_TOKEN } from "@/lib/pricing/coupon";
import { priceCart } from "@/lib/pricing/price-cart";
import type { CartPricing, CouponRejection, CouponRule, PricingLine } from "@/lib/pricing/types";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import { liveCampaignDiscounts } from "@/services/campaign.service";
import {
  OFFERED_ADD_ON_ORDER,
  PUBLISHED,
  offeredAddOnSelect,
  offeredAddOnWhere,
  toShopAddOn,
} from "@/services/catalogue.service";
import { resolveDelivery } from "@/services/delivery-zone.service";
import { releaseCartHolds } from "@/services/release-hold.service";
import { getVatRatePercent } from "@/services/store-settings.service";
import {
  BLOCKING_CART_LINE_ISSUES,
  type AppliedCoupon,
  type Cart,
  type CartLine,
  type CartQuote,
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
const MESSAGE_RELEASE_CLOSED = "This release isn't open for sale.";
const MESSAGE_IN_CART_FROM_SHOP = "This item is already in your cart from the shop. Remove it to buy it from the release.";
const MESSAGE_IN_CART_FROM_RELEASE = "This item is already in your cart from a release. Remove it to buy it here.";

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
      releaseId: true,
      release: {
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          completedAt: true,
          startsAt: true,
          endsAt: true,
          hidden: true,
        },
      },
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
              deletedAt: true,
              categoryId: true,
              warrantyMonths: true,
              addOns: { select: { addOnId: true, priceOverride: true } },
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
          addOn: { select: { id: true, name: true, kind: true, price: true, extraWarrantyMonths: true } },
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

type OfferedRow = Prisma.AddOnGetPayload<{ select: typeof offeredAddOnSelect }>;

interface ReleaseLineState {
  stock: number;
  closed: boolean;
}

const CLOSED_RELEASE_LINE: ReleaseLineState = { stock: 0, closed: true };

interface LineContext {
  offeredRows: OfferedRow[];
  discounts: Map<string, CampaignDiscount>;
  releaseLines: Map<string, ReleaseLineState>;
}

interface ReleaseQuantityCheck {
  cartId: string;
  releaseId: string;
  variantId: string;
  requested: number;
  current: number;
  visible: boolean;
}

const mergeLineSelect = {
  id: true,
  variantId: true,
  releaseId: true,
  quantity: true,
  addOns: { select: { addOnId: true, seenPrice: true } },
} satisfies Prisma.CartItemSelect;

type MergeLineRow = Prisma.CartItemGetPayload<{ select: typeof mergeLineSelect }>;

/* ---------- helpers ---------- */

function ownerWhere(owner: Owner) {
  return owner.kind === "user" ? { userId: owner.userId } : { guestTokenHash: owner.tokenHash };
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

function quantityConflict(message: string) {
  return new ServiceError("CONFLICT", message, 409, { quantity: [message] });
}

function assertQuantity(check: QuantityCheck) {
  const problem = quantityProblem(check);
  if (problem) throw quantityConflict(quantityMessage(problem, check.stock));
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
  const { id, label, note, price, kind, extraWarrantyMonths } = toShopAddOn(row);
  return { id, label, note, price, kind, extraWarrantyMonths };
}

function offeredForLine(rows: OfferedRow[], scope: AddOnScope) {
  return resolveOfferedAddOns(rows, scope).map(toOfferedAddOn);
}

async function offeredAddOnsFor(db: Tx, scopes: AddOnScope[]): Promise<OfferedRow[]> {
  if (scopes.length === 0) return [];
  const categoryIds = [...new Set(scopes.flatMap((scope) => scope.categoryIds))];
  return db.addOn.findMany({
    where: offeredAddOnWhere(scopes),
    select: {
      ...offeredAddOnSelect,
      categories: { where: { categoryId: { in: categoryIds } }, select: { categoryId: true } },
    },
    orderBy: OFFERED_ADD_ON_ORDER,
    take: OFFERED_ADD_ONS_QUERY_LIMIT,
  });
}

async function offeredPricesFor(scope: AddOnScope): Promise<Map<string, number>> {
  const rows = await prisma.addOn.findMany({
    where: offeredAddOnWhere([scope]),
    select: offeredAddOnSelect,
    orderBy: OFFERED_ADD_ON_ORDER,
    take: MAX_PRODUCT_ADD_ONS,
  });
  return new Map(resolveOfferedAddOns(rows, scope).map((row) => [row.id, row.price]));
}

function assertAddOnsOffered(addOnIds: string[], offered: Map<string, number>) {
  if (addOnIds.some((id) => !offered.has(id))) {
    throw new ServiceError("VALIDATION", MESSAGE_ADD_ON_UNAVAILABLE, 422, {
      addOnIds: [MESSAGE_ADD_ON_UNAVAILABLE],
    });
  }
}

/* ---------- mapping ---------- */

function buildLine(item: CartItemRow, { offeredRows, discounts, releaseLines }: LineContext): PricedCartLine {
  const { variant } = item;
  const { product } = variant;
  const { price: unitPrice, compareAtPrice, campaignDiscounted } = campaignVariantPrice(
    variant,
    discounts.get(product.id),
  );
  const scope = addOnScopeOf(product);
  const offeredAddOns = offeredForLine(offeredRows, scope);
  const offeredPrices = new Map(offeredAddOns.map((addOn) => [addOn.id, addOn.price]));
  const releaseLine = item.releaseId ? (releaseLines.get(item.id) ?? CLOSED_RELEASE_LINE) : null;
  const visible = releaseLine ? product.deletedAt === null : isProductVisible(product);
  const stock = releaseLine ? releaseLine.stock : variant.stock;
  const releaseClosed = releaseLine?.closed ?? false;

  const addOns = item.addOns.map((link) => ({
    id: link.addOn.id,
    label: link.addOn.name,
    price: offeredPrices.get(link.addOn.id) ?? link.addOn.price,
    seenPrice: link.seenPrice,
    available: offeredPrices.has(link.addOn.id),
  }));

  const pricing: PricingLine = {
    key: item.id,
    productId: product.id,
    categoryIds: scope.categoryIds,
    unitPrice,
    addOnUnitPrice: addOns
      .filter((addOn) => addOn.available)
      .reduce((sum, addOn) => sum + addOn.price, 0),
    quantity: item.quantity,
    purchasable: visible && !releaseClosed && stock > 0,
    campaignDiscounted,
  };

  const image = pickLineImage(product.images, variant.colour);
  const line: CartLine = {
    id: item.id,
    variantId: variant.id,
    release: item.release ? { id: item.release.id, title: item.release.title, slug: item.release.slug ?? "" } : null,
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
    maxQuantity: maxLineQuantity(stock),
    unitPrice,
    compareAtPrice,
    previousUnitPrice: unitPrice !== item.seenUnitPrice ? item.seenUnitPrice : null,
    addOns: addOns.map(({ id, label, price, available }) => ({ id, label, price, available })),
    offeredAddOns,
    lineTotal: lineTotal(pricing),
    issues: lineIssues({
      visible,
      releaseClosed,
      stock,
      quantity: item.quantity,
      unitPrice,
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

function emptyCart(couponsAllowed: boolean, deliveryFee: number | null, vatRatePercent: number): Cart {
  const pricing = priceCart({ lines: [], coupon: null, deliveryFee, vatRatePercent, now: new Date() });
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
  context: LineContext,
  customerRedemptions: number,
  vatRatePercent: number,
  { deliveryFee, now }: PriceOptions,
): PricedCart {
  const lines = row.items.map((item) => buildLine(item, context));
  const couponRow = owner.kind === "user" ? row.coupon : null;
  const pricing = priceCart({
    lines: lines.map((entry) => entry.pricing),
    coupon: couponRow ? { rule: toCouponRule(couponRow), customerRedemptions } : null,
    deliveryFee,
    vatRatePercent,
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

function lineScopes(row: CartRow): AddOnScope[] {
  return row.items.map((item) => addOnScopeOf(item.variant.product));
}

function lineDiscounts(db: Tx, row: CartRow, now: Date) {
  return liveCampaignDiscounts(db, row.items.map((item) => item.variant.product.id), now);
}

const allocationKey = (releaseId: string, variantId: string) => `${releaseId}:${variantId}`;

async function releaseLineStates(db: Tx, row: CartRow, now: Date): Promise<Map<string, ReleaseLineState>> {
  const lines = row.items.flatMap((item) => (item.releaseId ? [{ item, releaseId: item.releaseId }] : []));
  if (lines.length === 0) return new Map();

  const allocations = await db.releaseAllocation.findMany({
    where: { OR: lines.map(({ item, releaseId }) => ({ releaseId, variantId: item.variant.id })) },
    select: {
      releaseId: true,
      variantId: true,
      available: true,
      holds: { where: { cartId: row.id, status: "HELD" }, select: { quantity: true } },
    },
  });
  const stock = new Map(
    allocations.map((allocation) => [
      allocationKey(allocation.releaseId, allocation.variantId),
      allocation.available + allocation.holds.reduce((sum, hold) => sum + hold.quantity, 0),
    ]),
  );
  return new Map(
    lines.map(({ item, releaseId }) => {
      const units = stock.get(allocationKey(releaseId, item.variant.id)) ?? 0;
      const open =
        item.release !== null &&
        !item.release.hidden &&
        releaseOpenForSale(releaseStatus(item.release, units, now), { held: true });
      return [item.id, { stock: units, closed: !open }];
    }),
  );
}

async function loadLineContext(db: Tx, row: CartRow, now: Date): Promise<LineContext> {
  return {
    offeredRows: row.items.length > 0 ? await offeredAddOnsFor(db, lineScopes(row)) : [],
    discounts: await lineDiscounts(db, row, now),
    releaseLines: await releaseLineStates(db, row, now),
  };
}

/** The price a shopper sees for one variant right now, stored as the line's seen price. */
async function currentUnitPrice(price: number, productId: string) {
  const discounts = await liveCampaignDiscounts(prisma, [productId], new Date());
  return campaignPrice(price, discounts.get(productId));
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

  const context = await loadLineContext(db, row, options.now);
  const customerRedemptions =
    owner.kind === "user" && row.coupon ? await countRedemptions(db, row.coupon.id, owner.userId) : 0;
  const vatRatePercent = await getVatRatePercent(db);
  return priceRow(row, owner, context, customerRedemptions, vatRatePercent, options);
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

async function writeLineAddOns(tx: Tx, cartItemId: string, addOnIds: string[], offered: Map<string, number>) {
  await tx.cartItemAddOn.deleteMany({ where: { cartItemId } });
  if (addOnIds.length === 0) return;

  const current = await tx.addOn.findMany({
    where: { id: { in: addOnIds } },
    select: { id: true, price: true },
  });
  await tx.cartItemAddOn.createMany({
    data: current.map((addOn) => ({
      cartItemId,
      addOnId: addOn.id,
      seenPrice: offered.get(addOn.id) ?? addOn.price,
    })),
  });
}

const purchasableVariantSelect = {
  id: true,
  price: true,
  stock: true,
  product: {
    select: {
      id: true,
      categoryId: true,
      category: { select: { parentId: true } },
      addOns: { select: { addOnId: true, priceOverride: true } },
    },
  },
} satisfies Prisma.ProductVariantSelect;

function findPurchasableVariant(variantId: string, releaseId: string | null) {
  const where: Prisma.ProductVariantWhereInput = releaseId
    ? { id: variantId, product: { deletedAt: null }, releaseAllocations: { some: { releaseId } } }
    : { id: variantId, product: PUBLISHED };
  return prisma.productVariant.findFirst({ where, select: purchasableVariantSelect });
}

function sourceConflict(existingReleaseId: string | null) {
  return quantityConflict(existingReleaseId ? MESSAGE_IN_CART_FROM_RELEASE : MESSAGE_IN_CART_FROM_SHOP);
}

async function assertReleaseQuantity(tx: Tx, owner: Owner, check: ReleaseQuantityCheck) {
  if (check.requested <= check.current) return;
  const release = await tx.release.findUnique({
    where: { id: check.releaseId },
    select: {
      publishedAt: true,
      completedAt: true,
      startsAt: true,
      endsAt: true,
      hidden: true,
      slug: true,
      maxPerCustomer: true,
      allocations: {
        where: { variantId: check.variantId },
        select: { available: true, holds: { where: { cartId: check.cartId, status: "HELD" }, select: { quantity: true } } },
      },
    },
  });
  const allocation = release?.allocations[0];
  if (!release || !allocation) throw new ServiceError("NOT_FOUND", MESSAGE_ITEM_UNAVAILABLE, 404);

  const stock = allocation.available + allocation.holds.reduce((sum, hold) => sum + hold.quantity, 0);
  assertQuantity({ requested: check.requested, current: check.current, stock, visible: check.visible });
  if (release.hidden || !release.slug || !releaseOpenForSale(releaseStatus(release, stock, new Date()))) {
    throw quantityConflict(MESSAGE_RELEASE_CLOSED);
  }

  const others = await tx.cartItem.aggregate({
    where: { cartId: check.cartId, releaseId: check.releaseId, variantId: { not: check.variantId } },
    _sum: { quantity: true },
  });
  const tally =
    owner.kind === "user"
      ? await tx.releaseCustomerTally.findUnique({
          where: { releaseId_userId: { releaseId: check.releaseId, userId: owner.userId } },
          select: { quantity: true },
        })
      : null;
  const left = releaseCapLeft(release.maxPerCustomer, tally?.quantity ?? 0);
  if ((others._sum.quantity ?? 0) + check.requested > left) throw quantityConflict(releaseCapMessage(left));
}

function findOwnedLine(owner: Owner, itemId: string) {
  return prisma.cartItem.findFirst({
    where: { id: itemId, cart: ownerWhere(owner) },
    select: {
      id: true,
      cartId: true,
      releaseId: true,
      quantity: true,
      addOns: { select: { addOnId: true } },
      variant: {
        select: {
          id: true,
          price: true,
          stock: true,
          product: {
            select: {
              id: true,
              status: true,
              deletedAt: true,
              categoryId: true,
              category: {
                select: { status: true, parentId: true, parent: { select: { status: true } } },
              },
              addOns: { select: { addOnId: true, priceOverride: true } },
            },
          },
        },
      },
    },
  });
}

/* ---------- reads ---------- */

export async function getCart(owner: CartOwner, deliveryFee: number | null = null): Promise<Cart> {
  if (!owner) return emptyCart(false, deliveryFee, await getVatRatePercent());

  const priced = await loadPricedCart(prisma, owner, { deliveryFee, now: new Date() });
  return priced ? priced.cart : emptyCart(owner.kind === "user", deliveryFee, await getVatRatePercent());
}

/** Before an area is picked in an emirate that has areas, there are no options and no fee yet. */
export async function quoteCart(owner: CartOwner, { emirate, areaId, method }: CartQuoteData): Promise<CartQuote> {
  const delivery = await resolveDelivery(emirate, areaId);
  if (delivery.kind === "unavailable") throw new ServiceError("NOT_FOUND", delivery.message, 404);

  const options = delivery.kind === "ok" ? delivery.options : [];
  const fee = options.find((option) => option.method === method)?.fee ?? null;
  const cart = await getCart(owner, fee);
  return { cart, emirate, areaId: areaId ?? null, method, options };
}

/* ---------- item mutations ---------- */

export async function addCartItem(
  owner: CartOwner,
  input: AddCartItemData,
): Promise<{ cart: Cart; newGuestToken: string | null }> {
  const releaseId = input.releaseId ?? null;
  const variant = await findPurchasableVariant(input.variantId, releaseId);
  if (!variant) throw new ServiceError("NOT_FOUND", MESSAGE_ITEM_UNAVAILABLE, 404);
  const offered = await offeredPricesFor(addOnScopeOf(variant.product));
  assertAddOnsOffered(input.addOnIds, offered);
  const seenUnitPrice = await currentUnitPrice(variant.price, variant.product.id);

  let target: Owner;
  let newGuestToken: string | null = null;
  if (owner) {
    target = owner;
  } else {
    newGuestToken = createRandomToken();
    target = { kind: "guest", tokenHash: hashToken(newGuestToken) };
    await sweepStaleGuestCarts(new Date());
  }

  await prisma.$transaction(
    async (tx) => {
      const cartId = await findOrCreateCart(tx, target);
      await touchCart(tx, cartId);
      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId, variantId: variant.id } },
        select: { id: true, quantity: true, releaseId: true, addOns: { select: { addOnId: true } } },
      });
      if (existing && existing.releaseId !== releaseId) throw sourceConflict(existing.releaseId);
      if (!existing && (await tx.cartItem.count({ where: { cartId } })) >= CART_MAX_LINES) {
        throw quantityConflict(MESSAGE_CART_FULL);
      }

      const current = existing?.quantity ?? 0;
      const quantity = current + input.quantity;
      if (releaseId) {
        const check = { cartId, releaseId, variantId: variant.id, requested: quantity, current, visible: true };
        await assertReleaseQuantity(tx, target, check);
      } else {
        assertQuantity({ requested: quantity, current, stock: variant.stock, visible: true });
      }

      const lineId = existing
        ? (
            await tx.cartItem.update({
              where: { id: existing.id },
              data: { quantity, seenUnitPrice },
              select: { id: true },
            })
          ).id
        : (
            await tx.cartItem.create({
              data: { cartId, variantId: variant.id, releaseId, quantity, seenUnitPrice },
              select: { id: true },
            })
          ).id;

      const addOnIds = unionIds(existing?.addOns.map((link) => link.addOnId) ?? [], input.addOnIds);
      await writeLineAddOns(tx, lineId, addOnIds, offered);
      if (releaseId) await releaseCartHolds(tx, cartId);
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );

  return { cart: await getCart(target), newGuestToken };
}

export async function updateCartItem(owner: CartOwner, itemId: string, input: UpdateCartItemData) {
  if (!owner) throw lineNotFound();
  const line = await findOwnedLine(owner, itemId);
  if (!line) throw lineNotFound();

  const { product } = line.variant;
  const offered = await offeredPricesFor(addOnScopeOf(product));
  if (input.addOnIds) assertAddOnsOffered(input.addOnIds, offered);

  const quantity = input.quantity ?? line.quantity;
  const { releaseId } = line;
  if (!releaseId) {
    assertQuantity({
      requested: quantity,
      current: line.quantity,
      stock: line.variant.stock,
      visible: isProductVisible(product),
    });
  }
  const seenUnitPrice = await currentUnitPrice(line.variant.price, product.id);

  await prisma.$transaction(
    async (tx) => {
      await touchCart(tx, line.cartId);
      if (releaseId) {
        await assertReleaseQuantity(tx, owner, {
          cartId: line.cartId,
          releaseId,
          variantId: line.variant.id,
          requested: quantity,
          current: line.quantity,
          visible: product.deletedAt === null,
        });
      }
      await tx.cartItem.update({
        where: { id: line.id },
        data: { quantity, seenUnitPrice },
      });
      await writeLineAddOns(tx, line.id, input.addOnIds ?? line.addOns.map((link) => link.addOnId), offered);
      if (releaseId) await releaseCartHolds(tx, line.cartId);
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );

  return getCart(owner);
}

export async function removeCartItem(owner: CartOwner, itemId: string) {
  if (!owner) throw lineNotFound();
  const line = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: ownerWhere(owner) },
    select: { id: true, cartId: true, releaseId: true },
  });
  if (!line) throw lineNotFound();

  await prisma.$transaction(
    async (tx) => {
      await touchCart(tx, line.cartId);
      await tx.cartItem.deleteMany({ where: { id: line.id } });
      if (line.releaseId) await releaseCartHolds(tx, line.cartId);
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );
  return getCart(owner);
}

export async function acknowledgeCart(owner: CartOwner) {
  if (!owner) return getCart(owner);
  const row = await loadCartRow(owner);
  if (!row) return getCart(owner);

  const context = await loadLineContext(prisma, row, new Date());
  const lines = row.items.map((item) => buildLine(item, context));

  const lineUpdates = lines
    .filter(({ item, line }) => item.seenUnitPrice !== line.unitPrice)
    .map(({ item, line }) =>
      prisma.cartItem.updateMany({
        where: { id: item.id },
        data: { seenUnitPrice: line.unitPrice },
      }),
    );
  const addOnUpdates = lines.flatMap(({ item, line }) => {
    const prices = new Map(line.addOns.map((addOn) => [addOn.id, addOn.price]));
    return item.addOns
      .map((link) => ({ link, price: prices.get(link.addOn.id) ?? link.addOn.price }))
      .filter(({ link, price }) => link.seenPrice !== price)
      .map(({ link, price }) =>
        prisma.cartItemAddOn.updateMany({
          where: { cartItemId: item.id, addOnId: link.addOn.id },
          data: { seenPrice: price },
        }),
      );
  });
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

  const now = new Date();
  const context = await loadLineContext(prisma, row, now);
  const customerRedemptions = await countRedemptions(prisma, coupon.id, userId);
  const pricing = priceCart({
    lines: row.items.map((item) => buildLine(item, context).pricing),
    coupon: { rule: toCouponRule(coupon), customerRedemptions },
    deliveryFee: null,
    vatRatePercent: await getVatRatePercent(prisma),
    now,
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
    releaseId: row.releaseId,
    quantity: row.quantity,
    addOnIds: row.addOns.map((link) => link.addOnId),
  }));
}

function mergeTouchesRelease(plan: MergePlan, userLines: MergeLineRow[], guestLines: Map<string, MergeLineRow>) {
  const userReleases = new Map(userLines.map((line) => [line.id, line.releaseId]));
  return (
    plan.updates.some((update) => userReleases.get(update.userLineId)) ||
    plan.moves.some((id) => guestLines.get(id)?.releaseId)
  );
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

  await touchCart(tx, user.id);
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
  if (mergeTouchesRelease(plan, user.items, guestLines)) await releaseCartHolds(tx, user.id);
}

export async function adoptGuestCart(userId: string): Promise<void> {
  try {
    const tokenHash = await readGuestTokenHash();
    if (tokenHash) {
      await prisma.$transaction((tx) => mergeGuestCart(tx, userId, tokenHash), { timeout: DB_WRITE_TIMEOUT_MS });
    }
    await clearGuestCartCookie();
  } catch (error) {
    console.error("adoptGuestCart failed", error);
  }
}
