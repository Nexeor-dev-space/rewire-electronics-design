import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { EMIRATES, emirateLabel, type Emirate } from "@/lib/emirates";
import type { deliveryZoneSchema } from "@/validators/delivery-zone.validator";

type DeliveryZoneData = z.output<typeof deliveryZoneSchema>;

const zoneSelect = {
  emirate: true,
  standardFee: true,
  expressFee: true,
  standardMinDays: true,
  standardMaxDays: true,
  expressMinDays: true,
  expressMaxDays: true,
  updatedAt: true,
} satisfies Prisma.DeliveryZoneSelect;

type ZoneRow = Prisma.DeliveryZoneGetPayload<{ select: typeof zoneSelect }>;

function toConfiguredRow(row: ZoneRow) {
  return { ...row, label: emirateLabel(row.emirate), configured: true };
}

function toMissingRow(emirate: Emirate) {
  return {
    emirate,
    label: emirateLabel(emirate),
    configured: false,
    standardFee: null,
    expressFee: null,
    standardMinDays: null,
    standardMaxDays: null,
    expressMinDays: null,
    expressMaxDays: null,
    updatedAt: null,
  };
}

export async function listDeliveryZones() {
  const rows = await prisma.deliveryZone.findMany({ select: zoneSelect });
  const byEmirate = new Map(rows.map((row) => [row.emirate, row]));

  return EMIRATES.map(({ value }) => {
    const row = byEmirate.get(value);
    return row ? toConfiguredRow(row) : toMissingRow(value);
  });
}

export async function upsertDeliveryZone(emirate: Emirate, data: DeliveryZoneData) {
  const row = await prisma.deliveryZone.upsert({
    where: { emirate },
    create: { emirate, ...data },
    update: data,
    select: zoneSelect,
  });
  return toConfiguredRow(row);
}

export function findDeliveryZone(emirate: Emirate) {
  return prisma.deliveryZone.findUnique({ where: { emirate }, select: zoneSelect });
}
