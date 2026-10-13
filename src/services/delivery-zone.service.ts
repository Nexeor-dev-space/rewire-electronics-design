import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { DELIVERY_MESSAGES, deliveryOptions, effectiveRates } from "@/lib/delivery";
import { prisma } from "@/lib/db";
import { EMIRATES, emirateLabel, type Emirate } from "@/lib/emirates";
import { findDeliveryArea } from "@/services/delivery-area.service";
import type { DeliveryOption } from "@/types/cart";
import type { deliveryZoneSchema } from "@/validators/delivery-zone.validator";

type DeliveryZoneData = z.output<typeof deliveryZoneSchema>;

const zoneSelect = {
  emirate: true,
  enabled: true,
  standardFee: true,
  expressFee: true,
  standardMinDays: true,
  standardMaxDays: true,
  expressMinDays: true,
  expressMaxDays: true,
  updatedAt: true,
} satisfies Prisma.DeliveryZoneSelect;

type ZoneRow = Prisma.DeliveryZoneGetPayload<{ select: typeof zoneSelect }>;

/**
 * What a customer's emirate and area resolve to. `needs-area` means the
 * emirate has areas but none was given: a quote shows no options yet, an
 * order is refused.
 */
export type DeliveryResolution =
  | { kind: "ok"; options: DeliveryOption[]; area: { id: string; area: string } | null }
  | { kind: "needs-area" }
  | { kind: "unavailable"; field: "emirate" | "areaId"; message: string };

function toConfiguredRow(row: ZoneRow) {
  return { ...row, label: emirateLabel(row.emirate), configured: true };
}

function toMissingRow(emirate: Emirate) {
  return {
    emirate,
    label: emirateLabel(emirate),
    configured: false,
    enabled: false,
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

/**
 * The one place a delivery rule is chosen. The emirate must have an enabled
 * zone; when it has any areas, an enabled area of that emirate must be given,
 * and its own fees and days override the zone's.
 */
export async function resolveDelivery(emirate: Emirate, areaId: string | undefined): Promise<DeliveryResolution> {
  const zone = await findDeliveryZone(emirate);
  if (!zone || !zone.enabled) {
    return { kind: "unavailable", field: "emirate", message: DELIVERY_MESSAGES.NO_EMIRATE };
  }

  if (!areaId) {
    const areas = await prisma.deliveryArea.count({ where: { emirate } });
    if (areas > 0) return { kind: "needs-area" };
    return { kind: "ok", options: deliveryOptions(zone), area: null };
  }

  const row = await findDeliveryArea(emirate, areaId);
  if (!row || !row.enabled) {
    return { kind: "unavailable", field: "areaId", message: DELIVERY_MESSAGES.NO_AREA };
  }
  return {
    kind: "ok",
    options: deliveryOptions(effectiveRates(zone, row)),
    area: { id: row.id, area: row.area },
  };
}
