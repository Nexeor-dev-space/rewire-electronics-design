import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError, type Paginated } from "@/lib/api/api-response";
import { toShopCondition, toShopGrade } from "@/lib/catalogue";
import { ACCOUNT_LIST_PAGE_SIZE, ORDER_EVENT_LIMIT, RETURN_WINDOW_DAYS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  FULFILMENT_QUEUE_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_RECEIVED_NOTE,
  PAYMENT_STATUS_LABELS,
  accountOrdersWhere,
  nextStatuses,
  orderTimeline,
  paymentActions,
  returnableUntil,
  type ManualPaymentStatus,
  type OrderStatus,
} from "@/lib/orders";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import type {
  AdminOrderDetail,
  AdminOrderRow,
  OrderDetail,
  OrderLine,
  OrderSummary,
} from "@/types/order";
import type {
  adminOrderListQuerySchema,
  fulfilmentQuerySchema,
  fulfilmentUpdateSchema,
  orderStatusChangeSchema,
  updateOrderSchema,
} from "@/validators/order.validator";

type Tx = Prisma.TransactionClient;
type AdminOrderQuery = z.output<typeof adminOrderListQuerySchema>;
type FulfilmentQuery = z.output<typeof fulfilmentQuerySchema>;
type UpdateOrderData = z.output<typeof updateOrderSchema>;
type StatusChangeData = z.output<typeof orderStatusChangeSchema>;
type FulfilmentUpdateData = z.output<typeof fulfilmentUpdateSchema>;

interface Viewer {
  id: string;
  emailVerified: boolean;
}

const MESSAGE_ORDER_NOT_FOUND = "We couldn't find that order.";
const MESSAGE_TRACK_NOT_FOUND = "We couldn't find an order with those details.";
const MESSAGE_ORDER_CHANGED = "This order changed. Refresh and try again.";
const MESSAGE_NOT_IN_FULFILMENT = "This order isn't in the fulfilment queue.";

const lineSelect = {
  id: true,
  variantId: true,
  imageId: true,
  productName: true,
  productSlug: true,
  brandName: true,
  sku: true,
  storage: true,
  colour: true,
  condition: true,
  grade: true,
  warrantyMonths: true,
  imageAlt: true,
  unitPrice: true,
  addOnUnitPrice: true,
  quantity: true,
  lineTotal: true,
  addOns: {
    select: { addOnId: true, name: true, kind: true, price: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.OrderItemSelect;

const orderDetailSelect = {
  id: true,
  number: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  deliveryMethod: true,
  deliveryEtaMinDays: true,
  deliveryEtaMaxDays: true,
  deliveredAt: true,
  returnableUntil: true,
  trackingNumber: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  address1: true,
  address2: true,
  city: true,
  postalCode: true,
  emirate: true,
  subtotal: true,
  discount: true,
  deliveryFee: true,
  total: true,
  vatIncluded: true,
  vatRatePercent: true,
  refundedAmount: true,
  couponCode: true,
  items: { select: lineSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  events: {
    select: { status: true, note: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: ORDER_EVENT_LIMIT,
  },
} satisfies Prisma.OrderSelect;

const adminDetailSelect = {
  ...orderDetailSelect,
  placedAsGuest: true,
  staffNote: true,
  user: { select: { id: true, fullName: true, email: true, isGuest: true } },
  events: {
    select: {
      id: true,
      status: true,
      note: true,
      createdAt: true,
      actor: { select: { fullName: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: ORDER_EVENT_LIMIT,
  },
} satisfies Prisma.OrderSelect;

const summarySelect = {
  number: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  deliveryMethod: true,
  deliveryEtaMinDays: true,
  deliveryEtaMaxDays: true,
  total: true,
  items: {
    select: {
      productName: true,
      imageId: true,
      imageAlt: true,
      condition: true,
      grade: true,
      storage: true,
      colour: true,
      quantity: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 1,
  },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const adminRowSelect = {
  number: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  deliveryMethod: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  emirate: true,
  city: true,
  total: true,
  trackingNumber: true,
  placedAsGuest: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const stateSelect = {
  id: true,
  number: true,
  status: true,
  paymentStatus: true,
  refundedAmount: true,
  total: true,
} satisfies Prisma.OrderSelect;

type DetailRow = Prisma.OrderGetPayload<{ select: typeof orderDetailSelect }>;
type AdminDetailRow = Prisma.OrderGetPayload<{ select: typeof adminDetailSelect }>;
type LineRow = DetailRow["items"][number];
type SummaryRow = Prisma.OrderGetPayload<{ select: typeof summarySelect }>;
type AdminRow = Prisma.OrderGetPayload<{ select: typeof adminRowSelect }>;
type StateRow = Prisma.OrderGetPayload<{ select: typeof stateSelect }>;

/* ---------- mapping ---------- */

function isoOrNull(date: Date | null) {
  return date ? date.toISOString() : null;
}

function toLine(row: LineRow): OrderLine {
  return {
    id: row.id,
    variantId: row.variantId,
    productName: row.productName,
    productSlug: row.productSlug,
    brand: row.brandName,
    sku: row.sku,
    imageUrl: imageUrlOrNull(row.imageId),
    imageAlt: row.imageAlt,
    condition: toShopCondition(row.condition),
    grade: row.grade ? toShopGrade(row.grade) : null,
    storage: row.storage,
    colour: row.colour,
    warrantyMonths: row.warrantyMonths,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    addOnUnitPrice: row.addOnUnitPrice,
    lineTotal: row.lineTotal,
    addOns: row.addOns.map((addOn) => ({
      id: addOn.addOnId,
      name: addOn.name,
      kind: addOn.kind,
      price: addOn.price,
    })),
  };
}

function toDetail(row: DetailRow | AdminDetailRow): OrderDetail {
  return {
    number: row.number,
    placedAt: row.createdAt.toISOString(),
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    deliveryMethod: row.deliveryMethod,
    etaMinDays: row.deliveryEtaMinDays,
    etaMaxDays: row.deliveryEtaMaxDays,
    deliveredAt: isoOrNull(row.deliveredAt),
    returnableUntil: isoOrNull(row.returnableUntil),
    trackingNumber: row.trackingNumber,
    contact: { email: row.email, phone: row.phone, firstName: row.firstName, lastName: row.lastName },
    address: {
      address1: row.address1,
      address2: row.address2,
      city: row.city,
      postalCode: row.postalCode,
      emirate: row.emirate,
    },
    lines: row.items.map(toLine),
    totals: {
      subtotal: row.subtotal,
      discount: row.discount,
      delivery: row.deliveryFee,
      total: row.total,
      vatIncluded: row.vatIncluded,
      vatRatePercent: row.vatRatePercent,
      refunded: row.refundedAmount,
    },
    couponCode: row.couponCode,
    timeline: orderTimeline(row.status, row.events, row.createdAt),
  };
}

function toAdminDetail(row: AdminDetailRow): AdminOrderDetail {
  return {
    ...toDetail(row),
    customer: row.user,
    placedAsGuest: row.placedAsGuest,
    staffNote: row.staffNote,
    events: row.events.map((event) => ({
      id: event.id,
      status: event.status,
      note: event.note,
      at: event.createdAt.toISOString(),
      actorName: event.actor?.fullName ?? null,
    })),
    nextStatuses: nextStatuses(row),
    paymentActions: paymentActions(row),
  };
}

function toSummary(row: SummaryRow): OrderSummary {
  const first = row.items[0];
  return {
    number: row.number,
    placedAt: row.createdAt.toISOString(),
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    deliveryMethod: row.deliveryMethod,
    etaMinDays: row.deliveryEtaMinDays,
    etaMaxDays: row.deliveryEtaMaxDays,
    total: row.total,
    lineCount: row._count.items,
    firstLine: first
      ? {
          productName: first.productName,
          imageUrl: imageUrlOrNull(first.imageId),
          imageAlt: first.imageAlt,
          condition: toShopCondition(first.condition),
          grade: first.grade ? toShopGrade(first.grade) : null,
          storage: first.storage,
          colour: first.colour,
          quantity: first.quantity,
        }
      : null,
  };
}

function toAdminRow(row: AdminRow): AdminOrderRow {
  return {
    number: row.number,
    placedAt: row.createdAt.toISOString(),
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    deliveryMethod: row.deliveryMethod,
    customerName: `${row.firstName} ${row.lastName}`,
    email: row.email,
    phone: row.phone,
    emirate: row.emirate,
    city: row.city,
    total: row.total,
    lineCount: row._count.items,
    trackingNumber: row.trackingNumber,
    placedAsGuest: row.placedAsGuest,
  };
}

export function fulfilmentAuditView(row: AdminOrderRow) {
  return { status: row.status, trackingNumber: row.trackingNumber };
}

export function orderAuditView(order: AdminOrderDetail) {
  return {
    status: order.status,
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber,
    staffNote: order.staffNote,
  };
}

/* ---------- errors ---------- */

function orderChanged() {
  return new ServiceError("CONFLICT", MESSAGE_ORDER_CHANGED, 409);
}

function notFound() {
  return new ServiceError("NOT_FOUND", MESSAGE_ORDER_NOT_FOUND, 404);
}

function statusLabel(status: OrderStatus) {
  return ORDER_STATUS_LABELS[status].toLowerCase();
}

/* ---------- storefront reads ---------- */

export async function getOrderDetail(where: Prisma.OrderWhereInput): Promise<OrderDetail | null> {
  const row = await prisma.order.findFirst({ where, select: orderDetailSelect });
  return row ? toDetail(row) : null;
}

export async function listAccountOrders(viewer: Viewer, page: number): Promise<Paginated<OrderSummary>> {
  const where = accountOrdersWhere(viewer);
  const pageSize = ACCOUNT_LIST_PAGE_SIZE;
  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: summarySelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items: rows.map(toSummary), page, pageSize, total };
}

export async function getAccountOrder(viewer: Viewer, number: string): Promise<OrderDetail> {
  const order = await getOrderDetail({ number, ...accountOrdersWhere(viewer) });
  if (!order) throw notFound();
  return order;
}

export async function trackOrder(number: string, email: string): Promise<OrderDetail> {
  const order = await getOrderDetail({ number, email });
  if (!order) throw new ServiceError("NOT_FOUND", MESSAGE_TRACK_NOT_FOUND, 404);
  return order;
}

/* ---------- admin reads ---------- */

function adminSearchWhere(search: string | undefined): Prisma.OrderWhereInput {
  if (!search) return {};
  return {
    OR: [
      { number: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ],
  };
}

async function listRows(
  where: Prisma.OrderWhereInput,
  orderBy: Prisma.OrderOrderByWithRelationInput[],
  page: number,
  pageSize: number,
): Promise<Paginated<AdminOrderRow>> {
  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: adminRowSelect,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  return { items: rows.map(toAdminRow), page, pageSize, total };
}

export function listAdminOrders({ page, pageSize, search, status, paymentStatus }: AdminOrderQuery) {
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...adminSearchWhere(search),
  };
  return listRows(where, [{ createdAt: "desc" }, { id: "desc" }], page, pageSize);
}

export function listFulfilment({ page, pageSize, status }: FulfilmentQuery) {
  const where: Prisma.OrderWhereInput = {
    status: status ?? { in: [...FULFILMENT_QUEUE_STATUSES] },
  };
  return listRows(where, [{ createdAt: "asc" }, { id: "asc" }], page, pageSize);
}

export async function getAdminOrder(number: string): Promise<AdminOrderDetail> {
  const row = await prisma.order.findUnique({ where: { number }, select: adminDetailSelect });
  if (!row) throw notFound();
  return toAdminDetail(row);
}

export async function getAdminOrderRow(number: string): Promise<AdminOrderRow> {
  const row = await prisma.order.findUnique({ where: { number }, select: adminRowSelect });
  if (!row) throw notFound();
  return toAdminRow(row);
}

/* ---------- changes (inside a transaction) ---------- */

async function findState(tx: Tx, number: string): Promise<StateRow> {
  const row = await tx.order.findUnique({ where: { number }, select: stateSelect });
  if (!row) throw notFound();
  return row;
}

async function releaseOrder(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId, variantId: { not: null } },
    select: { variantId: true, quantity: true },
    orderBy: { variantId: "asc" },
  });
  for (const item of items) {
    if (!item.variantId) continue;
    await tx.productVariant.updateMany({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }

  const redemption = await tx.couponRedemption.findUnique({
    where: { orderId },
    select: { id: true, couponId: true },
  });
  if (!redemption) return;
  await tx.couponRedemption.delete({ where: { id: redemption.id } });
  await tx.coupon.updateMany({
    where: { id: redemption.couponId, redemptionCount: { gt: 0 } },
    data: { redemptionCount: { decrement: 1 } },
  });
}

async function applyStatusChange(
  tx: Tx,
  order: StateRow,
  to: OrderStatus,
  note: string,
  actorId: string,
) {
  if (!nextStatuses(order).includes(to)) {
    const message = `An order that is ${statusLabel(order.status)} can't move to ${statusLabel(to)}.`;
    throw new ServiceError("CONFLICT", message, 409, { status: [message] });
  }

  const now = new Date();
  const delivered =
    to === "DELIVERED" ? { deliveredAt: now, returnableUntil: returnableUntil(now, RETURN_WINDOW_DAYS) } : {};
  const { count } = await tx.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: to, ...delivered },
  });
  if (count === 0) throw orderChanged();

  await tx.orderStatusEvent.create({ data: { orderId: order.id, status: to, note, actorId } });
  if (to === "CANCELLED") await releaseOrder(tx, order.id);
}

async function applyPaymentChange(tx: Tx, order: StateRow, to: ManualPaymentStatus, actorId: string) {
  if (!paymentActions(order).includes(to)) {
    const message = `This order can't be marked ${PAYMENT_STATUS_LABELS[to].toLowerCase()}.`;
    throw new ServiceError("CONFLICT", message, 409, { paymentStatus: [message] });
  }

  const confirms = to === "PAID" && order.status === "PENDING_PAYMENT";
  const status: OrderStatus = confirms ? "CONFIRMED" : order.status;
  const { count } = await tx.order.updateMany({
    where: { id: order.id, paymentStatus: order.paymentStatus, status: order.status },
    data: {
      paymentStatus: to,
      status,
      ...(to === "REFUNDED" ? { refundedAmount: order.total } : {}),
    },
  });
  if (count === 0) throw orderChanged();

  const note = confirms ? PAYMENT_RECEIVED_NOTE : `Payment marked ${PAYMENT_STATUS_LABELS[to].toLowerCase()}`;
  await tx.orderStatusEvent.create({ data: { orderId: order.id, status, note, actorId } });
}

/* ---------- admin writes ---------- */

export async function updateOrder(number: string, data: UpdateOrderData) {
  const { count } = await prisma.order.updateMany({
    where: { number },
    data: {
      ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber } : {}),
      ...(data.staffNote !== undefined ? { staffNote: data.staffNote } : {}),
    },
  });
  if (count === 0) throw notFound();
  return getAdminOrder(number);
}

export async function changeOrderStatus(actorId: string, number: string, { status, note }: StatusChangeData) {
  await prisma.$transaction(async (tx) => {
    const order = await findState(tx, number);
    await applyStatusChange(tx, order, status, note, actorId);
  });
  return getAdminOrder(number);
}

export async function changePaymentStatus(actorId: string, number: string, to: ManualPaymentStatus) {
  await prisma.$transaction(async (tx) => {
    const order = await findState(tx, number);
    await applyPaymentChange(tx, order, to, actorId);
  });
  return getAdminOrder(number);
}

export async function updateFulfilment(actorId: string, number: string, data: FulfilmentUpdateData) {
  await prisma.$transaction(async (tx) => {
    const order = await findState(tx, number);
    if (!(FULFILMENT_QUEUE_STATUSES as readonly OrderStatus[]).includes(order.status)) {
      throw new ServiceError("CONFLICT", MESSAGE_NOT_IN_FULFILMENT, 409);
    }
    if (data.trackingNumber !== undefined) {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { trackingNumber: data.trackingNumber },
      });
      if (count === 0) throw orderChanged();
    }
    if (data.status) await applyStatusChange(tx, order, data.status, "", actorId);
  });
  return getAdminOrderRow(number);
}
