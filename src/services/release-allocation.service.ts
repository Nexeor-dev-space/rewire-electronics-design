import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { DB_WRITE_TIMEOUT_MS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { RELEASE_STATUS_LABELS, allowedEdits, canDropAllocation, releaseStatus } from "@/lib/releases";
import type { releaseAllocationsSchema } from "@/validators/release.validator";

type AllocationRows = z.output<typeof releaseAllocationsSchema>["allocations"];
type Db = Prisma.TransactionClient;

interface Change {
  variantId: string;
  sku: string;
  delta: number;
  current: { allocated: number; available: number; reserved: number; sold: number; returned: number } | null;
  remove: boolean;
}

const byVariant = (a: { variantId: string }, b: { variantId: string }) => (a.variantId < b.variantId ? -1 : 1);

const conflict = (message: string, variantId?: string) =>
  new ServiceError("CONFLICT", message, 409, variantId ? { [variantId]: [message] } : undefined);

async function lockOpenRelease(tx: Db, releaseId: string) {
  const { count } = await tx.release.updateMany({
    where: { id: releaseId, completedAt: null },
    data: { updatedAt: new Date() },
  });
  if (count > 0) return;
  const exists = await tx.release.count({ where: { id: releaseId } });
  if (exists === 0) throw new ServiceError("NOT_FOUND", "We couldn't find that release. It may have been deleted.", 404);
  throw conflict("This release has completed, so its allocations can't change.");
}

async function planChanges(tx: Db, releaseId: string, rows: AllocationRows): Promise<Change[]> {
  const release = await tx.release.findUniqueOrThrow({
    where: { id: releaseId },
    select: {
      publishedAt: true,
      completedAt: true,
      startsAt: true,
      endsAt: true,
      allocations: {
        select: {
          variantId: true,
          allocated: true,
          available: true,
          reserved: true,
          sold: true,
          returned: true,
          variant: { select: { sku: true } },
        },
      },
    },
  });
  const totalAvailable = release.allocations.reduce((sum, row) => sum + row.available, 0);
  const status = releaseStatus(release, totalAvailable, new Date());
  if (!allowedEdits(status).allocations) {
    throw conflict(`Allocations are locked while the release is ${RELEASE_STATUS_LABELS[status].toLowerCase()}.`);
  }

  const existing = new Map(release.allocations.map((row) => [row.variantId, row]));
  const newIds = rows.map((row) => row.variantId).filter((id) => !existing.has(id));
  const variants = await tx.productVariant.findMany({
    where: { id: { in: rows.map((row) => row.variantId) } },
    select: { id: true, sku: true, stock: true, product: { select: { deletedAt: true, status: true } } },
  });
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  const fields: Record<string, string[]> = {};
  const changes: Change[] = [];

  for (const row of rows) {
    const current = existing.get(row.variantId) ?? null;
    const variant = variantById.get(row.variantId);
    if (!variant) {
      fields[row.variantId] = ["That variant no longer exists."];
      continue;
    }
    if (newIds.includes(row.variantId) && (variant.product.deletedAt || variant.product.status === "ARCHIVED")) {
      fields[row.variantId] = [`${variant.sku} belongs to an archived or deleted product.`];
      continue;
    }
    const delta = row.allocated - (current?.allocated ?? 0);
    if (delta > 0 && variant.stock < delta) {
      fields[row.variantId] = [`Only ${variant.stock} of ${variant.sku} are in stock.`];
      continue;
    }
    if (delta < 0 && current && current.available < -delta) {
      fields[row.variantId] = [`Only ${current.available} of ${variant.sku} are unsold and can be taken back.`];
      continue;
    }
    if (delta !== 0 || !current) changes.push({ variantId: row.variantId, sku: variant.sku, delta, current, remove: false });
  }

  const kept = new Set(rows.map((row) => row.variantId));
  for (const current of release.allocations) {
    if (kept.has(current.variantId)) continue;
    if (current.reserved + current.sold + current.returned > 0) {
      fields[current.variantId] = [`${current.variant.sku} has held, sold or returned units, so it can't be removed.`];
      continue;
    }
    changes.push({ variantId: current.variantId, sku: current.variant.sku, delta: -current.available, current, remove: true });
  }

  if (Object.keys(fields).length > 0) {
    throw new ServiceError("CONFLICT", "Some allocations can't be saved. Check the highlighted rows.", 409, fields);
  }
  return changes.sort(byVariant);
}

async function moveStock(tx: Db, change: Change) {
  if (change.delta > 0) {
    const { count } = await tx.productVariant.updateMany({
      where: { id: change.variantId, stock: { gte: change.delta } },
      data: { stock: { decrement: change.delta } },
    });
    if (count === 0) {
      const variant = await tx.productVariant.findUnique({ where: { id: change.variantId }, select: { stock: true } });
      throw conflict(`Only ${variant?.stock ?? 0} of ${change.sku} are in stock.`, change.variantId);
    }
  } else if (change.delta < 0) {
    await tx.productVariant.update({
      where: { id: change.variantId },
      data: { stock: { increment: -change.delta } },
    });
  }
}

async function applyAllocation(tx: Db, releaseId: string, change: Change) {
  const key = { releaseId, variantId: change.variantId };
  if (change.remove) {
    const { count } = await tx.releaseAllocation.deleteMany({
      where: { ...key, reserved: 0, sold: 0, returned: 0, available: -change.delta },
    });
    if (count === 0) throw conflict(`${change.sku} changed while you were editing. Reload and try again.`, change.variantId);
    return;
  }
  if (change.delta > 0) {
    await tx.releaseAllocation.updateMany({
      where: key,
      data: { allocated: { increment: change.delta }, available: { increment: change.delta } },
    });
  } else if (change.delta < 0) {
    const units = -change.delta;
    const { count } = await tx.releaseAllocation.updateMany({
      where: { ...key, available: { gte: units } },
      data: { allocated: { decrement: units }, available: { decrement: units } },
    });
    if (count === 0) throw conflict(`Too few unsold units of ${change.sku} to take back.`, change.variantId);
  }
}

export async function dropVariantAllocations(tx: Db, variant: Prisma.ProductVariantWhereInput): Promise<boolean> {
  const rows = await tx.releaseAllocation.findMany({
    where: { variant },
    select: {
      id: true,
      allocated: true,
      reserved: true,
      sold: true,
      returned: true,
      release: { select: { publishedAt: true, completedAt: true, startsAt: true, endsAt: true } },
    },
    orderBy: { id: "asc" },
  });
  const now = new Date();
  if (!rows.every((row) => canDropAllocation(row, row.release, now))) return false;
  if (rows.length === 0) return true;

  const { count } = await tx.releaseAllocation.deleteMany({
    where: {
      reserved: 0,
      sold: 0,
      returned: 0,
      OR: rows.map((row) => ({ id: row.id, allocated: row.allocated })),
    },
  });
  if (count !== rows.length) throw conflict("A release changed while you were editing. Reload and try again.");
  return true;
}

export async function setAllocations(releaseId: string, rows: AllocationRows): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await lockOpenRelease(tx, releaseId);
      const changes = await planChanges(tx, releaseId, rows);
      for (const change of changes) await moveStock(tx, change);
      const created = changes.filter((change) => !change.current);
      if (created.length > 0) {
        await tx.releaseAllocation.createMany({
          data: created.map((change) => ({ releaseId, variantId: change.variantId })),
          skipDuplicates: true,
        });
      }
      for (const change of changes) await applyAllocation(tx, releaseId, change);
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );
}
