import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError, isUniqueViolation, type Paginated } from "@/lib/api/api-response";
import {
  ACCOUNT_LIST_PAGE_SIZE,
  ORDER_EVENT_LIMIT,
  REFERENCE_NUMBER_ATTEMPTS,
  RETURN_NUMBER_PREFIX,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { accountOrdersWhere } from "@/lib/orders";
import { generateReference } from "@/lib/reference-number";
import {
  ACTIVE_RETURN_STATUSES,
  CLOSED_RETURN_STATUSES,
  RETURN_STATUS_LABELS,
  canRefund,
  checkReturnItems,
  isReturnable,
  nextReturnStatuses,
  paymentStatusAfterRefund,
  refundableAmount,
  returnableQuantity,
  suggestedRefund,
  type ReturnStatus,
} from "@/lib/returns";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import type {
  AdminReturnDetail,
  AdminReturnRow,
  CustomerReturn,
  EligibleReturnOrder,
  ReturnLine,
} from "@/types/return";
import type {
  accountReturnsQuerySchema,
  adminReturnListQuerySchema,
  createReturnSchema,
  recordRefundSchema,
  returnStatusChangeSchema,
} from "@/validators/return.validator";

type Tx = Prisma.TransactionClient;
type AccountReturnsQuery = z.output<typeof accountReturnsQuerySchema>;
type AdminReturnQuery = z.output<typeof adminReturnListQuerySchema>;
type CreateReturnData = z.output<typeof createReturnSchema>;
type StatusChangeData = z.output<typeof returnStatusChangeSchema>;
type RecordRefundData = z.output<typeof recordRefundSchema>;

interface Viewer {
  id: string;
  emailVerified: boolean;
}

const MESSAGE_ORDER_NOT_FOUND = "We couldn't find that order.";
const MESSAGE_RETURN_NOT_FOUND = "We couldn't find that return.";
const MESSAGE_NOT_ELIGIBLE = "This order isn't eligible for returns.";
const MESSAGE_CHECK_FIELDS = "Please check the highlighted fields.";
const MESSAGE_RETURN_CHANGED = "This return changed. Refresh and try again.";
const MESSAGE_NOT_REFUNDABLE = "Only received or inspected returns can be refunded.";
const MESSAGE_REFUND_CONFLICT = "Another refund was recorded on this order. Refresh and try again.";
const MESSAGE_NO_PAYMENT ="This order has no payment to refund. Mark it paid first.";
const MESSAGE_FULLY_REFUNDED = "This order is already fully refunded.";
const VARIANT_LABEL_SEPARATOR = " · ";

const orderLineSelect = {
  id: true,
  productName: true,
  storage: true,
  colour: true,
  imageId: true,
  imageAlt: true,
  quantity: true,
} satisfies Prisma.OrderItemSelect;

const returnItemSelect = {
  orderItemId: true,
  quantity: true,
  orderItem: {
    select: {
      productName: true,
      storage: true,
      colour: true,
      imageId: true,
      imageAlt: true,
      unitPrice: true,
      addOnUnitPrice: true,
    },
  },
} satisfies Prisma.ReturnItemSelect;

const customerReturnSelect = {
  number: true,
  status: true,
  reason: true,
  detail: true,
  refundAmount: true,
  refundedAt: true,
  createdAt: true,
  order: { select: { number: true } },
  items: { select: returnItemSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
  events: {
    select: { status: true, note: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: ORDER_EVENT_LIMIT,
  },
} satisfies Prisma.ReturnRequestSelect;

const adminDetailSelect = {
  ...customerReturnSelect,
  refundReference: true,
  order: {
    select: {
      number: true,
      subtotal: true,
      discount: true,
      total: true,
      refundedAmount: true,
      paymentStatus: true,
      paymentMethod: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
  },
  events: {
    select: { status: true, note: true, createdAt: true, actor: { select: { fullName: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: ORDER_EVENT_LIMIT,
  },
} satisfies Prisma.ReturnRequestSelect;

const adminRowSelect = {
  number: true,
  status: true,
  reason: true,
  refundAmount: true,
  createdAt: true,
  order: { select: { number: true, firstName: true, lastName: true, email: true } },
  _count: { select: { items: true } },
} satisfies Prisma.ReturnRequestSelect;

const eligibleOrderSelect = {
  number: true,
  deliveredAt: true,
  returnableUntil: true,
  items: { select: orderLineSelect, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.OrderSelect;

type CustomerReturnRow = Prisma.ReturnRequestGetPayload<{ select: typeof customerReturnSelect }>;
type AdminDetailRow = Prisma.ReturnRequestGetPayload<{ select: typeof adminDetailSelect }>;
type AdminRow = Prisma.ReturnRequestGetPayload<{ select: typeof adminRowSelect }>;
type ReturnItemRow = CustomerReturnRow["items"][number];
type EligibleOrderRow = Prisma.OrderGetPayload<{ select: typeof eligibleOrderSelect }>;

/* ---------- mapping ---------- */

function variantLabel(storage: string | null, colour: string | null) {
  return [storage, colour].filter(Boolean).join(VARIANT_LABEL_SEPARATOR);
}

function toReturnLine(row: ReturnItemRow): ReturnLine {
  return {
    orderItemId: row.orderItemId,
    productName: row.orderItem.productName,
    variantLabel: variantLabel(row.orderItem.storage, row.orderItem.colour),
    imageUrl: imageUrlOrNull(row.orderItem.imageId),
    imageAlt: row.orderItem.imageAlt,
    quantity: row.quantity,
    unitPrice: row.orderItem.unitPrice,
  };
}

export function toCustomerReturn(row: CustomerReturnRow | AdminDetailRow): CustomerReturn {
  return {
    number: row.number,
    orderNumber: row.order.number,
    status: row.status,
    reason: row.reason,
    detail: row.detail,
    requestedAt: row.createdAt.toISOString(),
    refundAmount: row.refundAmount,
    refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
    items: row.items.map(toReturnLine),
    timeline: row.events.map((event) => ({
      status: event.status,
      label: RETURN_STATUS_LABELS[event.status],
      note: event.note,
      at: event.createdAt.toISOString(),
    })),
  };
}

function toAdminDetail(row: AdminDetailRow): AdminReturnDetail {
  const refundLines = row.items.map((item) => ({
    unitPrice: item.orderItem.unitPrice,
    addOnUnitPrice: item.orderItem.addOnUnitPrice,
    quantity: item.quantity,
  }));
  return {
    ...toCustomerReturn(row),
    customer: row.order.user,
    order: {
      number: row.order.number,
      total: row.order.total,
      refundedAmount: row.order.refundedAmount,
      paymentStatus: row.order.paymentStatus,
      paymentMethod: row.order.paymentMethod,
      refundable: refundableAmount(row.order),
    },
    suggestedRefund: suggestedRefund(row.order, refundLines),
    refundReference: row.refundReference,
    nextStatuses: nextReturnStatuses(row.status),
    canRefund:
      canRefund(row.status) &&
      (row.order.paymentStatus === "UNPAID" || refundableAmount(row.order) > 0),
    events: row.events.map((event) => ({
      status: event.status,
      note: event.note,
      actorName: event.actor?.fullName ?? null,
      at: event.createdAt.toISOString(),
    })),
  };
}

function toAdminRow(row: AdminRow): AdminReturnRow {
  return {
    number: row.number,
    orderNumber: row.order.number,
    customerName: `${row.order.firstName} ${row.order.lastName}`,
    email: row.order.email,
    status: row.status,
    reason: row.reason,
    itemCount: row._count.items,
    requestedAt: row.createdAt.toISOString(),
    refundAmount: row.refundAmount,
  };
}

function toEligibleOrders(row: EligibleOrderRow, returned: Map<string, number>): EligibleReturnOrder[] {
  if (!row.returnableUntil) return [];
  const lines = row.items.map((item) => ({
    orderItemId: item.id,
    productName: item.productName,
    variantLabel: variantLabel(item.storage, item.colour),
    imageUrl: imageUrlOrNull(item.imageId),
    imageAlt: item.imageAlt,
    quantity: item.quantity,
    returnableQuantity: returnableQuantity(item.quantity, returned.get(item.id) ?? 0),
  }));
  const order: EligibleReturnOrder = {
    orderNumber: row.number,
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    returnableUntil: row.returnableUntil.toISOString(),
    lines,
  };
  return [order];
}

export function returnAuditView(detail: AdminReturnDetail) {
  return {
    status: detail.status,
    refundAmount: detail.refundAmount,
    refundReference: detail.refundReference,
  };
}

/* ---------- errors ---------- */

function conflict(message: string, field?: string) {
  return new ServiceError("CONFLICT", message, 409, field ? { [field]: [message] } : undefined);
}

function returnNotFound() {
  return new ServiceError("NOT_FOUND", MESSAGE_RETURN_NOT_FOUND, 404);
}

function statusLabel(status: ReturnStatus) {
  return RETURN_STATUS_LABELS[status].toLowerCase();
}

/* ---------- returned quantities ---------- */

export async function returnedQuantities(db: Tx, orderItemIds: string[]): Promise<Map<string, number>> {
  if (orderItemIds.length === 0) return new Map();
  const groups = await db.returnItem.groupBy({
    by: ["orderItemId"],
    where: { orderItemId: { in: orderItemIds }, returnRequest: { status: { not: "DECLINED" } } },
    _sum: { quantity: true },
  });
  return new Map(groups.map((group) => [group.orderItemId, group._sum.quantity ?? 0]));
}

/* ---------- customer ---------- */

function stateWhere(state: AccountReturnsQuery["state"]): Prisma.ReturnRequestWhereInput {
  if (state === "active") return { status: { in: [...ACTIVE_RETURN_STATUSES] } };
  if (state === "closed") return { status: { in: [...CLOSED_RETURN_STATUSES] } };
  return {};
}

export async function listAccountReturns(
  viewer: Viewer,
  { page, state }: AccountReturnsQuery,
): Promise<Paginated<CustomerReturn>> {
  const where: Prisma.ReturnRequestWhereInput = { order: accountOrdersWhere(viewer), ...stateWhere(state) };
  const pageSize = ACCOUNT_LIST_PAGE_SIZE;
  const [rows, total] = await prisma.$transaction([
    prisma.returnRequest.findMany({
      where,
      select: customerReturnSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.returnRequest.count({ where }),
  ]);
  return { items: rows.map(toCustomerReturn), page, pageSize, total };
}

export async function listEligibleOrders(viewer: Viewer, page: number): Promise<Paginated<EligibleReturnOrder>> {
  const where: Prisma.OrderWhereInput = {
    ...accountOrdersWhere(viewer),
    status: "DELIVERED",
    returnableUntil: { gt: new Date() },
  };
  const pageSize = ACCOUNT_LIST_PAGE_SIZE;
  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      select: eligibleOrderSelect,
      orderBy: [{ deliveredAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);
  const returned = await returnedQuantities(prisma, rows.flatMap((row) => row.items.map((item) => item.id)));
  return { items: rows.flatMap((row) => toEligibleOrders(row, returned)), page, pageSize, total };
}

async function createInTransaction(tx: Tx, viewer: Viewer, input: CreateReturnData) {
  const now = new Date();
  const ownedOrder = { number: input.orderNumber, ...accountOrdersWhere(viewer) };
  const { count } = await tx.order.updateMany({ where: ownedOrder, data: { updatedAt: now } });
  if (count === 0) throw new ServiceError("NOT_FOUND", MESSAGE_ORDER_NOT_FOUND, 404);

  const order = await tx.order.findUniqueOrThrow({
    where: { number: input.orderNumber },
    select: { id: true, status: true, returnableUntil: true, items: { select: { id: true, quantity: true } } },
  });
  if (!isReturnable(order, now)) throw conflict(MESSAGE_NOT_ELIGIBLE);

  const returned = await returnedQuantities(tx, order.items.map((item) => item.id));
  const lines = order.items.map((item) => ({
    orderItemId: item.id,
    returnableQuantity: returnableQuantity(item.quantity, returned.get(item.id) ?? 0),
  }));
  const fields = checkReturnItems(lines, input.items);
  if (fields) throw new ServiceError("VALIDATION", MESSAGE_CHECK_FIELDS, 422, fields);

  return tx.returnRequest.create({
    data: {
      number: generateReference(RETURN_NUMBER_PREFIX),
      order: { connect: { id: order.id } },
      reason: input.reason,
      detail: input.detail,
      items: {
        create: input.items.map((item) => ({
          orderItem: { connect: { id: item.orderItemId } },
          quantity: item.quantity,
        })),
      },
      events: { create: [{ status: "REQUESTED" }] },
    },
    select: customerReturnSelect,
  });
}

export async function createReturn(viewer: Viewer, input: CreateReturnData): Promise<CustomerReturn> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const row = await prisma.$transaction((tx) => createInTransaction(tx, viewer, input));
      return toCustomerReturn(row);
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= REFERENCE_NUMBER_ATTEMPTS) throw error;
    }
  }
}

/* ---------- admin reads ---------- */

function adminSearchWhere(search: string | undefined): Prisma.ReturnRequestWhereInput {
  if (!search) return {};
  return {
    OR: [
      { number: { contains: search, mode: "insensitive" } },
      { order: { number: { contains: search, mode: "insensitive" } } },
      { order: { email: { contains: search, mode: "insensitive" } } },
    ],
  };
}

export async function listAdminReturns({
  page,
  pageSize,
  search,
  status,
}: AdminReturnQuery): Promise<Paginated<AdminReturnRow>> {
  const where: Prisma.ReturnRequestWhereInput = {
    ...(status ? { status } : {}),
    ...adminSearchWhere(search),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.returnRequest.findMany({
      where,
      select: adminRowSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.returnRequest.count({ where }),
  ]);
  return { items: rows.map(toAdminRow), page, pageSize, total };
}

export async function getAdminReturn(number: string): Promise<AdminReturnDetail> {
  const row = await prisma.returnRequest.findUnique({ where: { number }, select: adminDetailSelect });
  if (!row) throw returnNotFound();
  return toAdminDetail(row);
}

/* ---------- admin writes ---------- */

export async function changeReturnStatus(
  number: string,
  { status: to, note }: StatusChangeData,
  actorId: string,
): Promise<AdminReturnDetail> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.returnRequest.findUnique({ where: { number }, select: { id: true, status: true } });
    if (!row) throw returnNotFound();
    if (!nextReturnStatuses(row.status).includes(to)) {
      throw conflict(`A return that is ${statusLabel(row.status)} can't move to ${statusLabel(to)}.`, "status");
    }

    const { count } = await tx.returnRequest.updateMany({
      where: { id: row.id, status: row.status },
      data: { status: to },
    });
    if (count === 0) throw conflict(MESSAGE_RETURN_CHANGED);

    await tx.returnStatusEvent.create({ data: { returnRequestId: row.id, status: to, note, actorId } });
  });
  return getAdminReturn(number);
}

export async function recordRefund(
  number: string,
  { amount, reference, note }: RecordRefundData,
  actorId: string,
): Promise<AdminReturnDetail> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.returnRequest.findUnique({
      where: { number },
      select: {
        id: true,
        status: true,
        order: {
          select: { id: true, status: true, total: true, refundedAmount: true, paymentStatus: true },
        },
      },
    });
    if (!row) throw returnNotFound();
    if (!canRefund(row.status)) throw conflict(MESSAGE_NOT_REFUNDABLE);

    const { order } = row;
    if (order.paymentStatus === "UNPAID") throw conflict(MESSAGE_NO_PAYMENT);
    const refundable = refundableAmount(order);
    if (refundable === 0) throw conflict(MESSAGE_FULLY_REFUNDED);
    if (amount > refundable) {
      const message = `You can refund at most ${formatMoney(refundable)}.`;
      throw new ServiceError("VALIDATION", message, 422, { amount: [message] });
    }

    const refundedAfter = order.refundedAmount + amount;
    const orderUpdate = await tx.order.updateMany({
      where: { id: order.id, refundedAmount: order.refundedAmount, paymentStatus: order.paymentStatus },
      data: { refundedAmount: refundedAfter, paymentStatus: paymentStatusAfterRefund(order.total, refundedAfter) },
    });
    if (orderUpdate.count === 0) throw conflict(MESSAGE_REFUND_CONFLICT);

    const now = new Date();
    const returnUpdate = await tx.returnRequest.updateMany({
      where: { id: row.id, status: row.status },
      data: { status: "REFUNDED", refundAmount: amount, refundReference: reference, refundedAt: now },
    });
    if (returnUpdate.count === 0) throw conflict(MESSAGE_RETURN_CHANGED);

    await tx.returnStatusEvent.create({
      data: { returnRequestId: row.id, status: "REFUNDED", note, actorId },
    });
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        note: `Refund of ${formatMoney(amount)} recorded for ${number}`,
        actorId,
      },
    });
  });
  return getAdminReturn(number);
}
