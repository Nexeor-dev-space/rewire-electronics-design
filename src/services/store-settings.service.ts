import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { LOW_STOCK_THRESHOLD, RETURN_WINDOW_DAYS, VAT_RATE_PERCENT } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { StoreSettingsView } from "@/types/return";
import type { storeSettingsSchema } from "@/validators/return.validator";
import type { vatSettingsSchema } from "@/validators/vat.validator";

type StoreSettingsData = z.output<typeof storeSettingsSchema>;
type VatSettingsData = z.output<typeof vatSettingsSchema>;

const SETTINGS_ID = 1;

const settingsSelect = {
  returnWindowDays: true,
  vatRatePercent: true,
  updatedAt: true,
} satisfies Prisma.StoreSettingsSelect;

type SettingsRow = Prisma.StoreSettingsGetPayload<{ select: typeof settingsSelect }>;

function toView(row: SettingsRow | null): StoreSettingsView {
  return {
    returnWindowDays: row?.returnWindowDays ?? RETURN_WINDOW_DAYS,
    vatRatePercent: row?.vatRatePercent ?? VAT_RATE_PERCENT,
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}

export async function getStoreSettings(db: Prisma.TransactionClient = prisma): Promise<StoreSettingsView> {
  const row = await db.storeSettings.findUnique({ where: { id: SETTINGS_ID }, select: settingsSelect });
  return toView(row);
}

export async function getLowStockThreshold(): Promise<number> {
  const row = await prisma.storeSettings.findUnique({
    where: { id: SETTINGS_ID },
    select: { lowStockThreshold: true },
  });
  return row?.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
}

/** The rate the cart and checkout price with; falls back to the default until one is saved. */
export async function getVatRatePercent(db: Prisma.TransactionClient = prisma): Promise<number> {
  return (await getStoreSettings(db)).vatRatePercent;
}

export async function updateVatSettings(actorId: string, input: VatSettingsData): Promise<StoreSettingsView> {
  const row = await prisma.storeSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, vatRatePercent: input.vatRatePercent, updatedById: actorId },
    update: { vatRatePercent: input.vatRatePercent, updatedById: actorId },
    select: settingsSelect,
  });
  return toView(row);
}

export async function updateStoreSettings(actorId: string, input: StoreSettingsData): Promise<StoreSettingsView> {
  const row = await prisma.storeSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, returnWindowDays: input.returnWindowDays, updatedById: actorId },
    update: { returnWindowDays: input.returnWindowDays, updatedById: actorId },
    select: settingsSelect,
  });
  return toView(row);
}
