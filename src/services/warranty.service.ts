import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError, isUniqueViolation, type Paginated } from "@/lib/api/api-response";
import {
  ORDER_EVENT_LIMIT,
  REFERENCE_NUMBER_ATTEMPTS,
  WARRANTY_CLAIM_NUMBER_PREFIX,
  WARRANTY_CLAIMS_LIMIT,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { lineWarrantyMonths, warrantyEndsAt } from "@/lib/orders";
import { generateReference } from "@/lib/reference-number";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import {
  OPEN_WARRANTY_CLAIM_STATUSES,
  WARRANTY_CLAIM_STATUS_LABELS,
  WARRANTY_ORDER_STATUSES,
  checkWarrantyStart,
  isClaimOpen,
  nextClaimStatuses,
  splitSerials,
  warrantyStatus,
  type WarrantyClaimStatus,
  type WarrantyStatus,
} from "@/lib/warranty";
import { variantLabel } from "@/services/return.service";
import type { AdminWarrantyClaimDetail, AdminWarrantyDetail, AdminWarrantyRow } from "@/types/warranty";
import type {
  adminWarrantyListQuerySchema,
  claimStatusChangeSchema,
  createClaimSchema,
  updateWarrantySchema,
} from "@/validators/warranty.validator";

type Tx = Prisma.TransactionClient;
type AdminWarrantyQuery = z.output<typeof adminWarrantyListQuerySchema>;
type UpdateWarrantyData = z.output<typeof updateWarrantySchema>;
type CreateClaimData = z.output<typeof createClaimSchema>;
type ClaimStatusChangeData = z.output<typeof claimStatusChangeSchema>;

const MESSAGE_WARRANTY_NOT_FOUND = "We couldn't find that warranty.";
const MESSAGE_CLAIM_NOT_FOUND = "We couldn't find that claim.";
const MESSAGE_NOT_STARTED = "The warranty starts when the order is delivered.";
const MESSAGE_NOT_ELIGIBLE = "A claim can only be raised while the warranty is active.";
const MESSAGE_SERIAL_NOT_ON_DEVICE = "That serial isn't recorded on this device.";
const MESSAGE_OPEN_CLAIM = "This device already has an open claim.";
const MESSAGE_CLAIM_CHANGED = "This claim changed. Refresh and try again.";

/** Only lines on paid, live orders are warranty records. */
const warrantyLineWhere = {
  order: { status: { in: [...WARRANTY_ORDER_STATUSES] } },
} satisfies Prisma.OrderItemWhereInput;

const openClaimWhere = {
  status: { in: [...OPEN_WARRANTY_CLAIM_STATUSES] },
} satisfies Prisma.WarrantyClaimWhereInput;

const rowSelect = {
  id: true,
  serialNumber: true,
  productName: true,
  storage: true,
  colour: true,
  warrantyStartsAt: true,
  warrantyEndsAt: true,
  order: { select: { number: true, firstName: true, lastName: true, email: true } },
  warrantyClaims: { where: openClaimWhere, select: { id: true }, take: 1 },
} satisfies Prisma.OrderItemSelect;

const detailSelect = {
  id: true,
  serialNumber: true,
  productName: true,
  brandName: true,
  sku: true,
  storage: true,
  colour: true,
  imageId: true,
  imageAlt: true,
  quantity: true,
  warrantyMonths: true,
  warrantyStartsAt: true,
  warrantyEndsAt: true,
  addOns: {
    select: { name: true, extraWarrantyMonths: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
  order: {
    select: {
      number: true,
      status: true,
      createdAt: true,
      deliveredAt: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      user: { select: { id: true, fullName: true, email: true } },
      events: {
        where: { status: "DISPATCHED" },
        select: { createdAt: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 1,
      },
    },
  },
  warrantyClaims: {
    select: { number: true, serialNumber: true, status: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: WARRANTY_CLAIMS_LIMIT,
  },
} satisfies Prisma.OrderItemSelect;

const claimDetailSelect = {
  number: true,
  status: true,
  serialNumber: true,
  issue: true,
  createdAt: true,
  orderItem: {
    select: {
      id: true,
      productName: true,
      storage: true,
      colour: true,
      warrantyStartsAt: true,
      warrantyEndsAt: true,
      order: { select: { number: true, firstName: true, lastName: true, email: true } },
    },
  },
  events: {
    select: { status: true, note: true, createdAt: true, actor: { select: { fullName: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: ORDER_EVENT_LIMIT,
  },
} satisfies Prisma.WarrantyClaimSelect;

type Row = Prisma.OrderItemGetPayload<{ select: typeof rowSelect }>;
type DetailRow = Prisma.OrderItemGetPayload<{ select: typeof detailSelect }>;
type ClaimDetailRow = Prisma.WarrantyClaimGetPayload<{ select: typeof claimDetailSelect }>;

/* ---------- mapping ---------- */

function isoOrNull(date: Date | null) {
  return date ? date.toISOString() : null;
}

function fullName(order: { firstName: string; lastName: string }) {
  return `${order.firstName} ${order.lastName}`.trim();
}

function toRow(row: Row, now: Date): AdminWarrantyRow {
  return {
    id: row.id,
    serialNumber: row.serialNumber,
    productName: row.productName,
    variantLabel: variantLabel(row.storage, row.colour),
    customerName: fullName(row.order),
    email: row.order.email,
    orderNumber: row.order.number,
    warrantyStartsAt: isoOrNull(row.warrantyStartsAt),
    warrantyEndsAt: isoOrNull(row.warrantyEndsAt),
    status: warrantyStatus(row, now),
    claimInProgress: row.warrantyClaims.length > 0,
  };
}

function toDetail(row: DetailRow, now: Date): AdminWarrantyDetail {
  const status = warrantyStatus(row, now);
  const serials = splitSerials(row.serialNumber);
  const openClaims = row.warrantyClaims.filter((claim) => isClaimOpen(claim.status));
  const claimed = new Set(openClaims.map((claim) => claim.serialNumber));
  const claimableSerials = serials.filter((serial) => !claimed.has(serial));
  const { order } = row;

  return {
    id: row.id,
    serialNumber: row.serialNumber,
    serials,
    productName: row.productName,
    brand: row.brandName,
    sku: row.sku,
    variantLabel: variantLabel(row.storage, row.colour),
    imageUrl: imageUrlOrNull(row.imageId),
    imageAlt: row.imageAlt,
    quantity: row.quantity,
    status,
    warrantyStartsAt: isoOrNull(row.warrantyStartsAt),
    warrantyEndsAt: isoOrNull(row.warrantyEndsAt),
    baseMonths: row.warrantyMonths,
    totalMonths: lineWarrantyMonths(row),
    coverAddOns: row.addOns.filter((addOn) => addOn.extraWarrantyMonths > 0),
    order: {
      number: order.number,
      status: order.status,
      placedAt: order.createdAt.toISOString(),
      dispatchedAt: isoOrNull(order.events[0]?.createdAt ?? null),
      deliveredAt: isoOrNull(order.deliveredAt),
    },
    contact: { name: fullName(order), email: order.email, phone: order.phone },
    customer: order.user,
    claims: row.warrantyClaims.map((claim) => ({
      number: claim.number,
      serialNumber: claim.serialNumber,
      status: claim.status,
      raisedAt: claim.createdAt.toISOString(),
    })),
    claimInProgress: openClaims.length > 0,
    claimableSerials,
    canRaiseClaim: status === "ACTIVE" && claimableSerials.length > 0,
  };
}

function toClaimDetail(row: ClaimDetailRow, now: Date): AdminWarrantyClaimDetail {
  const { orderItem } = row;
  return {
    number: row.number,
    status: row.status,
    serialNumber: row.serialNumber,
    issue: row.issue,
    raisedAt: row.createdAt.toISOString(),
    nextStatuses: nextClaimStatuses(row.status),
    events: row.events.map((event) => ({
      status: event.status,
      note: event.note,
      actorName: event.actor?.fullName ?? null,
      at: event.createdAt.toISOString(),
    })),
    device: {
      id: orderItem.id,
      productName: orderItem.productName,
      variantLabel: variantLabel(orderItem.storage, orderItem.colour),
      warrantyStatus: warrantyStatus(orderItem, now),
      warrantyEndsAt: isoOrNull(orderItem.warrantyEndsAt),
    },
    orderNumber: orderItem.order.number,
    customerName: fullName(orderItem.order),
    email: orderItem.order.email,
  };
}

export function warrantyAuditView(detail: AdminWarrantyDetail) {
  return {
    serialNumber: detail.serialNumber,
    warrantyStartsAt: detail.warrantyStartsAt,
    warrantyEndsAt: detail.warrantyEndsAt,
  };
}

export function claimAuditView(detail: AdminWarrantyClaimDetail) {
  return { status: detail.status, serialNumber: detail.serialNumber };
}

/* ---------- errors ---------- */

function warrantyNotFound() {
  return new ServiceError("NOT_FOUND", MESSAGE_WARRANTY_NOT_FOUND, 404);
}

function claimNotFound() {
  return new ServiceError("NOT_FOUND", MESSAGE_CLAIM_NOT_FOUND, 404);
}

function conflict(message: string, field?: string) {
  return new ServiceError("CONFLICT", message, 409, field ? { [field]: [message] } : undefined);
}

function invalid(message: string, field: string) {
  return new ServiceError("VALIDATION", message, 422, { [field]: [message] });
}

function claimStatusLabel(status: WarrantyClaimStatus) {
  return WARRANTY_CLAIM_STATUS_LABELS[status].toLowerCase();
}

/* ---------- warranties ---------- */

function statusWhere(status: WarrantyStatus | undefined, now: Date): Prisma.OrderItemWhereInput {
  if (status === "PENDING") return { OR: [{ warrantyStartsAt: null }, { warrantyStartsAt: { gt: now } }] };
  if (status === "ACTIVE") return { warrantyStartsAt: { lte: now }, warrantyEndsAt: { gt: now } };
  if (status === "EXPIRED") return { warrantyEndsAt: { lte: now } };
  return {};
}

function searchWhere(search: string | undefined): Prisma.OrderItemWhereInput {
  if (!search) return {};
  const contains = { contains: search, mode: "insensitive" } as const;
  return {
    OR: [
      { serialNumber: contains },
      { productName: contains },
      { order: { number: contains } },
      { order: { email: contains } },
      { order: { firstName: contains } },
      { order: { lastName: contains } },
    ],
  };
}

export async function listAdminWarranties({
  page,
  pageSize,
  search,
  status,
}: AdminWarrantyQuery): Promise<Paginated<AdminWarrantyRow>> {
  const now = new Date();
  const where: Prisma.OrderItemWhereInput = {
    ...warrantyLineWhere,
    AND: [statusWhere(status, now), searchWhere(search)],
  };
  const [rows, total] = await prisma.$transaction([
    prisma.orderItem.findMany({
      where,
      select: rowSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.orderItem.count({ where }),
  ]);
  return { items: rows.map((row) => toRow(row, now)), page, pageSize, total };
}

export async function getAdminWarranty(id: string): Promise<AdminWarrantyDetail> {
  const row = await prisma.orderItem.findFirst({ where: { id, ...warrantyLineWhere }, select: detailSelect });
  if (!row) throw warrantyNotFound();
  return toDetail(row, new Date());
}

/**
 * Corrects the serial or the start date. The end date is always worked out
 * again from the start and the line's cover, so the status can't drift from
 * the dates. Product, order and customer are never touched.
 */
export async function updateWarranty(id: string, data: UpdateWarrantyData): Promise<AdminWarrantyDetail> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.orderItem.findFirst({
      where: { id, ...warrantyLineWhere },
      select: {
        warrantyMonths: true,
        warrantyStartsAt: true,
        addOns: { select: { extraWarrantyMonths: true } },
        order: { select: { createdAt: true } },
      },
    });
    if (!item) throw warrantyNotFound();

    const dates: Prisma.OrderItemUpdateInput = {};
    if (data.warrantyStartsAt !== undefined) {
      if (!item.warrantyStartsAt) throw conflict(MESSAGE_NOT_STARTED, "warrantyStartsAt");
      const startsAt = new Date(data.warrantyStartsAt);
      const message = checkWarrantyStart(startsAt, item.order.createdAt, new Date());
      if (message) throw invalid(message, "warrantyStartsAt");
      dates.warrantyStartsAt = startsAt;
      dates.warrantyEndsAt = warrantyEndsAt(startsAt, lineWarrantyMonths(item));
    }

    await tx.orderItem.update({
      where: { id },
      data: {
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber || null } : {}),
        ...dates,
      },
    });
  });
  return getAdminWarranty(id);
}

/* ---------- claims ---------- */

async function createClaimInTransaction(tx: Tx, orderItemId: string, input: CreateClaimData, actorId: string) {
  const now = new Date();
  // Locks the line, so two claims raised at once for one device can't both pass the open claim check.
  const { count } = await tx.orderItem.updateMany({
    where: { id: orderItemId, ...warrantyLineWhere },
    data: { updatedAt: now },
  });
  if (count === 0) throw warrantyNotFound();

  const item = await tx.orderItem.findUniqueOrThrow({
    where: { id: orderItemId },
    select: { serialNumber: true, warrantyStartsAt: true, warrantyEndsAt: true },
  });
  if (warrantyStatus(item, now) !== "ACTIVE") throw conflict(MESSAGE_NOT_ELIGIBLE);
  if (!splitSerials(item.serialNumber).includes(input.serialNumber)) {
    throw invalid(MESSAGE_SERIAL_NOT_ON_DEVICE, "serialNumber");
  }

  const open = await tx.warrantyClaim.findFirst({
    where: { orderItemId, serialNumber: input.serialNumber, ...openClaimWhere },
    select: { id: true },
  });
  if (open) throw conflict(MESSAGE_OPEN_CLAIM, "serialNumber");

  return tx.warrantyClaim.create({
    data: {
      number: generateReference(WARRANTY_CLAIM_NUMBER_PREFIX),
      orderItem: { connect: { id: orderItemId } },
      serialNumber: input.serialNumber,
      issue: input.issue,
      events: { create: [{ status: "RAISED", actorId }] },
    },
    select: { number: true },
  });
}

export async function createClaim(
  orderItemId: string,
  input: CreateClaimData,
  actorId: string,
): Promise<AdminWarrantyClaimDetail> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const { number } = await prisma.$transaction((tx) => createClaimInTransaction(tx, orderItemId, input, actorId));
      return getAdminClaim(number);
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= REFERENCE_NUMBER_ATTEMPTS) throw error;
    }
  }
}

export async function getAdminClaim(number: string): Promise<AdminWarrantyClaimDetail> {
  const row = await prisma.warrantyClaim.findUnique({ where: { number }, select: claimDetailSelect });
  if (!row) throw claimNotFound();
  return toClaimDetail(row, new Date());
}

export async function changeClaimStatus(
  number: string,
  { status: to, note }: ClaimStatusChangeData,
  actorId: string,
): Promise<AdminWarrantyClaimDetail> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.warrantyClaim.findUnique({ where: { number }, select: { id: true, status: true } });
    if (!row) throw claimNotFound();
    if (!nextClaimStatuses(row.status).includes(to)) {
      throw conflict(
        `A claim at ${claimStatusLabel(row.status)} can't move to ${claimStatusLabel(to)}.`,
        "status",
      );
    }

    const { count } = await tx.warrantyClaim.updateMany({
      where: { id: row.id, status: row.status },
      data: { status: to },
    });
    if (count === 0) throw conflict(MESSAGE_CLAIM_CHANGED);

    await tx.warrantyClaimEvent.create({ data: { claimId: row.id, status: to, note, actorId } });
  });
  return getAdminClaim(number);
}
