import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { RETURN_WINDOW_DAYS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { StoreSettingsView } from "@/types/return";
import type { storeSettingsSchema } from "@/validators/return.validator";

type StoreSettingsData = z.output<typeof storeSettingsSchema>;

const SETTINGS_ID = 1;

const settingsSelect = { returnWindowDays: true, updatedAt: true } satisfies Prisma.StoreSettingsSelect;

type SettingsRow = Prisma.StoreSettingsGetPayload<{ select: typeof settingsSelect }>;

function toView(row: SettingsRow | null): StoreSettingsView {
  return {
    returnWindowDays: row?.returnWindowDays ?? RETURN_WINDOW_DAYS,
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}

export async function getStoreSettings(db: Prisma.TransactionClient = prisma): Promise<StoreSettingsView> {
  const row = await db.storeSettings.findUnique({ where: { id: SETTINGS_ID }, select: settingsSelect });
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
