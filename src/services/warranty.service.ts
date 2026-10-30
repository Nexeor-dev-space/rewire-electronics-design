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
const MESSAGE_NO_SERIAL = "Record the device's serial or IMEI before raising a claim.";
const MESSAGE_OPEN_CLAIM = "This device already has an open claim.";
const MESSAGE_CLAIM_CHANGED = "This claim changed. Refresh and try again.";

/** Only devices on paid, live orders are warranty records. */
const warrantyDeviceWhere = {
  orderItem: { order: { status: { in: [...WARRANTY_ORDER_STATUSES] } } },
} satisfies Prisma.DeviceWhereInput;

const openClaimWhere = {
  status: { in: [...OPEN_WARRANTY_CLAIM_STATUSES] },
} satisfies Prisma.WarrantyClaimWhereInput;

const rowSelect = {
  id: true,
  unitNumber: true,
  serialNumber: true,
  orderItem: {
    select: {
      productName: true,
      storage: true,
      colour: true,
      quantity: true,
      warrantyStartsAt: true,
      warrantyEndsAt: true,
      order: { select: { number: true, firstName: true, lastName: true, email: true } },
    },
  },
  warrantyClaims: { where: openClaimWhere, select: { id: true }, take: 1 },
} satisfies Prisma.DeviceSelect;

const detailSelect = {
  id: true,
  unitNumber: true,
  serialNumber: true,
  orderItem: {
    select: {
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
    },
  },
  warrantyClaims: {
    select: { number: true, serialNumber: true, status: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: WARRANTY_CLAIMS_LIMIT,
  },
} satisfies Prisma.DeviceSelect;

const claimDetailSelect = {
  number: true,
  status: true,
  serialNumber: true,
  issue: true,
  createdAt: true,
  device: {
    select: {
      id: true,
      unitNumber: true,
      orderItem: {
        select: {
          productName: true,
          storage: true,
          colour: true,
          quantity: true,
          warrantyStartsAt: true,
          warrantyEndsAt: true,
          order: { select: { number: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  },
  events: {
    select: { status: true, note: true, createdAt: true, actor: { select: { fullName: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: ORDER_EVENT_LIMIT,
  },
} satisfies Prisma.WarrantyClaimSelect;

type Row = Prisma.DeviceGetPayload<{ select: typeof rowSelect }>;
type DetailRow = Prisma.DeviceGetPayload<{ select: typeof detailSelect }>;
type ClaimDetailRow = Prisma.WarrantyClaimGetPayload<{ select: typeof claimDetailSelect }>;

/* ---------- mapping ---------- */

function isoOrNull(date: Date | null) {
  return date ? date.toISOString() : null;
}

function fullName(order: { firstName: string; lastName: string }) {
  return `${order.firstName} ${order.lastName}`.trim();
}

function toRow(row: Row, now: Date): AdminWarrantyRow {
  const line = row.orderItem;
  return {
    id: row.id,
    serialNumber: row.serialNumber,
    unitNumber: row.unitNumber,
    quantity: line.quantity,
    productName: line.productName,
    variantLabel: variantLabel(line.storage, line.colour),
    customerName: fullName(line.order),
    email: line.order.email,
    orderNumber: line.order.number,
    warrantyStartsAt: isoOrNull(line.warrantyStartsAt),
    warrantyEndsAt: isoOrNull(line.warrantyEndsAt),
    status: warrantyStatus(line, now),
    claimInProgress: row.warrantyClaims.length > 0,
  };
}

function toDetail(row: DetailRow, now: Date): AdminWarrantyDetail {
  const line = row.orderItem;
  const { order } = line;
  const status = warrantyStatus(line, now);
  const claimInProgress = row.warrantyClaims.some((claim) => isClaimOpen(claim.status));

  return {
    id: row.id,
    serialNumber: row.serialNumber,
    unitNumber: row.unitNumber,
    quantity: line.quantity,
    productName: line.productName,
    brand: line.brandName,
    sku: line.sku,
    variantLabel: variantLabel(line.storage, line.colour),
    imageUrl: imageUrlOrNull(line.imageId),
    imageAlt: line.imageAlt,
    status,
    warrantyStartsAt: isoOrNull(line.warrantyStartsAt),
    warrantyEndsAt: isoOrNull(line.warrantyEndsAt),
    baseMonths: line.warrantyMonths,
    totalMonths: lineWarrantyMonths(line),
    coverAddOns: line.addOns.filter((addOn) => addOn.extraWarrantyMonths > 0),
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
    claimInProgress,
    canRaiseClaim: status === "ACTIVE" && Boolean(row.serialNumber) && !claimInProgress,
  };
}

function toClaimDetail(row: ClaimDetailRow, now: Date): AdminWarrantyClaimDetail {
  const { device } = row;
  const line = device.orderItem;
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
      id: device.id,
      unitNumber: device.unitNumber,
      quantity: line.quantity,
      productName: line.productName,
      variantLabel: variantLabel(line.storage, line.colour),
      warrantyStatus: warrantyStatus(line, now),
      warrantyEndsAt: isoOrNull(line.warrantyEndsAt),
    },
    orderNumber: line.order.number,
    customerName: fullName(line.order),
    email: line.order.email,
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

function statusWhere(status: WarrantyStatus | undefined, now: Date): Prisma.DeviceWhereInput {
  if (status === "PENDING") {
    return { orderItem: { OR: [{ warrantyStartsAt: null }, { warrantyStartsAt: { gt: now } }] } };
  }
  if (status === "ACTIVE") return { orderItem: { warrantyStartsAt: { lte: now }, warrantyEndsAt: { gt: now } } };
  if (status === "EXPIRED") return { orderItem: { warrantyEndsAt: { lte: now } } };
  return {};
}

function searchWhere(search: string | undefined): Prisma.DeviceWhereInput {
  if (!search) return {};
  const contains = { contains: search, mode: "insensitive" } as const;
  return {
    OR: [
      { serialNumber: contains },
      { orderItem: { productName: contains } },
      { orderItem: { order: { number: contains } } },
      { orderItem: { order: { email: contains } } },
      { orderItem: { order: { firstName: contains } } },
      { orderItem: { order: { lastName: contains } } },
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
  const where: Prisma.DeviceWhereInput = {
    ...warrantyDeviceWhere,
    AND: [statusWhere(status, now), searchWhere(search)],
  };
  const [rows, total] = await prisma.$transaction([
    prisma.device.findMany({
      where,
      select: rowSelect,
      orderBy: [{ orderItem: { createdAt: "desc" } }, { orderItemId: "asc" }, { unitNumber: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.device.count({ where }),
  ]);
  return { items: rows.map((row) => toRow(row, now)), page, pageSize, total };
}

export async function getAdminWarranty(id: string): Promise<AdminWarrantyDetail> {
  const row = await prisma.device.findFirst({ where: { id, ...warrantyDeviceWhere }, select: detailSelect });
  if (!row) throw warrantyNotFound();
  return toDetail(row, new Date());
}

/**
 * Corrects the device's serial, or the warranty start. The start lives on the
 * order line, so it moves for every unit on that line, and the end date is
 * always worked out again from it. Product, order and customer are never touched.
 */
export async function updateWarranty(id: string, data: UpdateWarrantyData): Promise<AdminWarrantyDetail> {
  await prisma.$transaction(async (tx) => {
    const device = await tx.device.findFirst({
      where: { id, ...warrantyDeviceWhere },
      select: {
        orderItem: {
          select: {
            id: true,
            warrantyMonths: true,
            warrantyStartsAt: true,
            addOns: { select: { extraWarrantyMonths: true } },
            order: { select: { createdAt: true } },
          },
        },
      },
    });
    if (!device) throw warrantyNotFound();
    const line = device.orderItem;

    if (data.serialNumber !== undefined) {
      await tx.device.update({ where: { id }, data: { serialNumber: data.serialNumber || null } });
    }

    if (data.warrantyStartsAt !== undefined) {
      if (!line.warrantyStartsAt) throw conflict(MESSAGE_NOT_STARTED, "warrantyStartsAt");
      const startsAt = new Date(data.warrantyStartsAt);
      const message = checkWarrantyStart(startsAt, line.order.createdAt, new Date());
      if (message) throw invalid(message, "warrantyStartsAt");
      await tx.orderItem.update({
        where: { id: line.id },
        data: { warrantyStartsAt: startsAt, warrantyEndsAt: warrantyEndsAt(startsAt, lineWarrantyMonths(line)) },
      });
    }
  });
  return getAdminWarranty(id);
}

/* ---------- claims ---------- */

async function createClaimInTransaction(tx: Tx, deviceId: string, input: CreateClaimData, actorId: string) {
  const now = new Date();
  // Locks the device, so two claims raised at once for it can't both pass the open claim check.
  const { count } = await tx.device.updateMany({
    where: { id: deviceId, ...warrantyDeviceWhere },
    data: { updatedAt: now },
  });
  if (count === 0) throw warrantyNotFound();

  const device = await tx.device.findUniqueOrThrow({
    where: { id: deviceId },
    select: { serialNumber: true, orderItem: { select: { warrantyStartsAt: true, warrantyEndsAt: true } } },
  });
  if (warrantyStatus(device.orderItem, now) !== "ACTIVE") throw conflict(MESSAGE_NOT_ELIGIBLE);
  if (!device.serialNumber) throw conflict(MESSAGE_NO_SERIAL);

  const open = await tx.warrantyClaim.findFirst({ where: { deviceId, ...openClaimWhere }, select: { id: true } });
  if (open) throw conflict(MESSAGE_OPEN_CLAIM);

  return tx.warrantyClaim.create({
    data: {
      number: generateReference(WARRANTY_CLAIM_NUMBER_PREFIX),
      device: { connect: { id: deviceId } },
      serialNumber: device.serialNumber,
      issue: input.issue,
      events: { create: [{ status: "RAISED", actorId }] },
    },
    select: { number: true },
  });
}

export async function createClaim(
  deviceId: string,
  input: CreateClaimData,
  actorId: string,
): Promise<AdminWarrantyClaimDetail> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const { number } = await prisma.$transaction((tx) => createClaimInTransaction(tx, deviceId, input, actorId));
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
