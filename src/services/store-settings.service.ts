import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { LOW_STOCK_THRESHOLD, RETURN_WINDOW_DAYS, VAT_RATE_PERCENT } from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { InvoiceSettingsView } from "@/types/invoice";
import type { StoreSettingsView } from "@/types/return";
import type { invoiceSettingsSchema } from "@/validators/invoice.validator";
import type { storeSettingsSchema } from "@/validators/return.validator";
import type { vatSettingsSchema } from "@/validators/vat.validator";

type StoreSettingsData = z.output<typeof storeSettingsSchema>;
type VatSettingsData = z.output<typeof vatSettingsSchema>;
type InvoiceSettingsData = z.output<typeof invoiceSettingsSchema>;

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

/* ---------- invoice seller details (docs/INVOICES.md) ---------- */

const invoiceSettingsSelect = {
  invoiceSellerName: true,
  invoiceSellerTrn: true,
  invoiceSellerAddress: true,
  invoiceSellerEmail: true,
  invoiceTerms: true,
  updatedAt: true,
} satisfies Prisma.StoreSettingsSelect;

type InvoiceSettingsRow = Prisma.StoreSettingsGetPayload<{ select: typeof invoiceSettingsSelect }>;

function toInvoiceView(row: InvoiceSettingsRow | null): InvoiceSettingsView {
  return {
    sellerName: row?.invoiceSellerName ?? "",
    sellerTrn: row?.invoiceSellerTrn ?? "",
    sellerAddress: row?.invoiceSellerAddress ?? "",
    sellerEmail: row?.invoiceSellerEmail ?? "",
    terms: row?.invoiceTerms ?? "",
    updatedAt: row ? row.updatedAt.toISOString() : null,
  };
}

export async function getInvoiceSettings(): Promise<InvoiceSettingsView> {
  const row = await prisma.storeSettings.findUnique({ where: { id: SETTINGS_ID }, select: invoiceSettingsSelect });
  return toInvoiceView(row);
}

export async function updateInvoiceSettings(actorId: string, input: InvoiceSettingsData): Promise<InvoiceSettingsView> {
  const data = {
    invoiceSellerName: input.sellerName,
    invoiceSellerTrn: input.sellerTrn,
    invoiceSellerAddress: input.sellerAddress,
    invoiceSellerEmail: input.sellerEmail,
    invoiceTerms: input.terms,
    updatedById: actorId,
  };
  const row = await prisma.storeSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
    select: invoiceSettingsSelect,
  });
  return toInvoiceView(row);
}

/**
 * Hands out the next invoice sequence. Raising the counter locks the
 * settings row until the caller's transaction ends, so concurrent issuers
 * queue here and numbers are never skipped or repeated.
 */
export async function nextInvoiceSequence(tx: Prisma.TransactionClient): Promise<number> {
  const row = await tx.storeSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, lastInvoiceSequence: 1 },
    update: { lastInvoiceSequence: { increment: 1 } },
    select: { lastInvoiceSequence: true },
  });
  return row.lastInvoiceSequence;
}
