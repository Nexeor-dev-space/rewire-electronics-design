import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError, isUniqueViolation } from "@/lib/api/api-response";
import { MAX_DELIVERY_AREAS_PER_EMIRATE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { emirateLabel, type Emirate } from "@/lib/emirates";
import type { DeliveryAreaOptions } from "@/types/delivery";
import type { deliveryAreaListQuerySchema, deliveryAreaSchema } from "@/validators/delivery-zone.validator";

type DeliveryAreaData = z.output<typeof deliveryAreaSchema>;
type DeliveryAreaQuery = z.output<typeof deliveryAreaListQuerySchema>;

const areaSelect = {
  id: true,
  emirate: true,
  area: true,
  enabled: true,
  standardFee: true,
  expressFee: true,
  standardMinDays: true,
  standardMaxDays: true,
  expressMinDays: true,
  expressMaxDays: true,
  updatedAt: true,
} satisfies Prisma.DeliveryAreaSelect;

type AreaRow = Prisma.DeliveryAreaGetPayload<{ select: typeof areaSelect }>;

const MESSAGE_AREA_TAKEN = "That area already exists in this emirate.";
const MESSAGE_AREA_LIMIT = `An emirate can have up to ${MAX_DELIVERY_AREAS_PER_EMIRATE} areas.`;

const notFound = () => new ServiceError("NOT_FOUND", "We couldn't find that area.", 404);
const areaTaken = () => new ServiceError("CONFLICT", MESSAGE_AREA_TAKEN, 409, { area: [MESSAGE_AREA_TAKEN] });

function toItem(row: AreaRow) {
  return { ...row, emirateLabel: emirateLabel(row.emirate) };
}

/* ---------- reads ---------- */

export async function listDeliveryAreas({ page, pageSize, emirate, search }: DeliveryAreaQuery) {
  const where: Prisma.DeliveryAreaWhereInput = {
    ...(emirate ? { emirate } : {}),
    ...(search ? { area: { contains: search, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.deliveryArea.findMany({
      where,
      select: areaSelect,
      orderBy: [{ emirate: "asc" }, { area: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.deliveryArea.count({ where }),
  ]);

  return { items: rows.map(toItem), page, pageSize, total };
}

export async function getDeliveryArea(id: string) {
  const row = await prisma.deliveryArea.findUnique({ where: { id }, select: areaSelect });
  if (!row) throw notFound();
  return toItem(row);
}

/** An area of that emirate, or null. Disabled areas are returned; the caller decides. */
export function findDeliveryArea(emirate: Emirate, id: string) {
  return prisma.deliveryArea.findFirst({ where: { id, emirate }, select: areaSelect });
}

export async function listDeliveryAreaOptions(emirate: Emirate): Promise<DeliveryAreaOptions> {
  const [configured, areas] = await prisma.$transaction([
    prisma.deliveryArea.count({ where: { emirate } }),
    prisma.deliveryArea.findMany({
      where: { emirate, enabled: true },
      select: { id: true, area: true },
      orderBy: { area: "asc" },
      take: MAX_DELIVERY_AREAS_PER_EMIRATE,
    }),
  ]);
  return { required: configured > 0, areas };
}

/* ---------- writes ---------- */

export async function createDeliveryArea(data: DeliveryAreaData) {
  try {
    const row = await prisma.$transaction(async (tx) => {
      await assertRoomIn(tx, data.emirate);
      await assertAreaFree(tx, data.emirate, data.area);
      return tx.deliveryArea.create({ data, select: areaSelect });
    });
    return toItem(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw areaTaken();
    throw error;
  }
}

export async function updateDeliveryArea(id: string, data: DeliveryAreaData) {
  try {
    const row = await prisma.$transaction(async (tx) => {
      const current = await tx.deliveryArea.findUnique({ where: { id }, select: { emirate: true } });
      if (!current) throw notFound();
      if (current.emirate !== data.emirate) await assertRoomIn(tx, data.emirate);
      await assertAreaFree(tx, data.emirate, data.area, id);
      return tx.deliveryArea.update({ where: { id }, data, select: areaSelect });
    });
    return toItem(row);
  } catch (error) {
    if (isUniqueViolation(error)) throw areaTaken();
    throw error;
  }
}

/* ---------- rules ---------- */

/** Areas are unique per emirate ignoring case, so "Al Barsha" and "al barsha" clash. */
async function assertAreaFree(tx: Prisma.TransactionClient, emirate: Emirate, area: string, exceptId?: string) {
  const owner = await tx.deliveryArea.findFirst({
    where: { emirate, area: { equals: area, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  if (owner) throw areaTaken();
}

async function assertRoomIn(tx: Prisma.TransactionClient, emirate: Emirate) {
  const count = await tx.deliveryArea.count({ where: { emirate } });
  if (count >= MAX_DELIVERY_AREAS_PER_EMIRATE) {
    throw new ServiceError("CONFLICT", MESSAGE_AREA_LIMIT, 409, { emirate: [MESSAGE_AREA_LIMIT] });
  }
}
