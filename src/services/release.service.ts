import "server-only";

import { randomBytes } from "node:crypto";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { DB_WRITE_TIMEOUT_MS, RELEASE_REMINDER_DEFAULTS_MINUTES, RELEASE_SLUG_SUFFIX_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  RELEASE_STATUS_LABELS,
  allowedEdits,
  canChangeState,
  canDeleteRelease,
  endedWindow,
  publishBlocker,
  releaseStatus,
  type ReleaseStateAction,
  type ReleaseStatus,
} from "@/lib/releases";
import { slugify } from "@/lib/utils";
import type { AdminReleaseDetail, AdminReleaseRow, LiveRelease, ReleaseTotals } from "@/types/release";
import type { releaseListQuerySchema, releaseSchema } from "@/validators/release.validator";

type ReleaseData = z.output<typeof releaseSchema>;
type ReleaseQuery = z.output<typeof releaseListQuerySchema>;
type Db = Prisma.TransactionClient;

const rowSelect = {
  id: true,
  slug: true,
  title: true,
  edition: true,
  startsAt: true,
  endsAt: true,
  publishedAt: true,
  completedAt: true,
  hidden: true,
  maxPerCustomer: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ReleaseSelect;

const detailSelect = {
  ...rowSelect,
  description: true,
  allocations: {
    orderBy: [{ variant: { product: { name: "asc" } } }, { variant: { sortOrder: "asc" } }],
    select: {
      id: true,
      variantId: true,
      allocated: true,
      available: true,
      reserved: true,
      sold: true,
      returned: true,
      variant: {
        select: {
          sku: true,
          storage: true,
          colour: true,
          condition: true,
          price: true,
          stock: true,
          product: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.ReleaseSelect;

type Row = Prisma.ReleaseGetPayload<{ select: typeof rowSelect }>;
type DetailRow = Prisma.ReleaseGetPayload<{ select: typeof detailSelect }>;

interface AllocationSums {
  productId: string;
  allocated: number;
  available: number;
  sold: number;
}

const EMPTY_TOTALS: ReleaseTotals = { productCount: 0, allocated: 0, sold: 0, remaining: 0 };

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that release. It may have been deleted.", 404);

function sumAllocations(rows: AllocationSums[]): ReleaseTotals {
  return {
    productCount: new Set(rows.map((row) => row.productId)).size,
    allocated: rows.reduce((sum, row) => sum + row.allocated, 0),
    sold: rows.reduce((sum, row) => sum + row.sold, 0),
    remaining: rows.reduce((sum, row) => sum + row.available, 0),
  };
}

async function totalsFor(db: Db, releaseIds: string[]): Promise<Map<string, ReleaseTotals>> {
  const rows = await db.releaseAllocation.findMany({
    where: { releaseId: { in: releaseIds } },
    select: { releaseId: true, allocated: true, available: true, sold: true, variant: { select: { productId: true } } },
  });
  const grouped = new Map<string, AllocationSums[]>();
  for (const row of rows) {
    const list = grouped.get(row.releaseId) ?? [];
    list.push({ productId: row.variant.productId, allocated: row.allocated, available: row.available, sold: row.sold });
    grouped.set(row.releaseId, list);
  }
  return new Map([...grouped].map(([id, list]) => [id, sumAllocations(list)]));
}

function toRow({ completedAt, ...row }: Row, totals: ReleaseTotals, now: Date): AdminReleaseRow {
  return {
    ...row,
    ...totals,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: releaseStatus({ ...row, completedAt }, totals.remaining, now),
  };
}

function toDetail(row: DetailRow, now: Date): AdminReleaseDetail {
  const { allocations, description, ...base } = row;
  const totals = sumAllocations(
    allocations.map((allocation) => ({ ...allocation, productId: allocation.variant.product.id })),
  );
  return {
    ...toRow(base, totals, now),
    description,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    allocations: allocations.map(({ variant, ...allocation }) => ({
      ...allocation,
      sku: variant.sku,
      storage: variant.storage,
      colour: variant.colour,
      condition: variant.condition,
      price: variant.price,
      stock: variant.stock,
      product: variant.product,
    })),
  };
}

function notCompletedWhere(now: Date): Prisma.ReleaseWhereInput {
  return { completedAt: null, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
}

function openWhere(now: Date): Prisma.ReleaseWhereInput {
  return { publishedAt: { not: null }, startsAt: { lte: now }, AND: [notCompletedWhere(now)] };
}

function statusWhere(status: ReleaseStatus, now: Date): Prisma.ReleaseWhereInput {
  switch (status) {
    case "DRAFT":
      return { publishedAt: null };
    case "COMPLETED":
      return { publishedAt: { not: null }, OR: [{ completedAt: { not: null } }, { endsAt: { lte: now } }] };
    case "UPCOMING":
      return { publishedAt: { not: null }, startsAt: { gt: now }, AND: [notCompletedWhere(now)] };
    case "LIVE":
      return { AND: [openWhere(now), { allocations: { some: { available: { gt: 0 } } } }] };
    case "SOLD_OUT":
      return { AND: [openWhere(now), { allocations: { none: { available: { gt: 0 } } } }] };
  }
}

function newSlug(title: string) {
  return `${slugify(title) || "release"}-${randomBytes(RELEASE_SLUG_SUFFIX_BYTES).toString("hex")}`;
}

async function lockRelease(db: Db, id: string, where: Prisma.ReleaseWhereInput = {}) {
  const { count } = await db.release.updateMany({ where: { id, ...where }, data: { updatedAt: new Date() } });
  return count > 0;
}

async function loadDetail(db: Db, id: string): Promise<DetailRow> {
  const row = await db.release.findUnique({ where: { id }, select: detailSelect });
  if (!row) throw notFound();
  return row;
}

/* ---------- reads ---------- */

export async function listReleases({ page, pageSize, search, status, sort }: ReleaseQuery) {
  const now = new Date();
  const filters: Prisma.ReleaseWhereInput[] = [];
  if (search) {
    filters.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { edition: { contains: search, mode: "insensitive" } },
      ],
    });
  }
  if (status) filters.push(statusWhere(status, now));
  const where: Prisma.ReleaseWhereInput = { AND: filters };
  const direction = sort === "opens_asc" ? "asc" : "desc";

  const [rows, total] = await prisma.$transaction([
    prisma.release.findMany({
      where,
      select: rowSelect,
      orderBy: [{ startsAt: direction }, { id: direction }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.release.count({ where }),
  ]);

  const totals = await totalsFor(prisma, rows.map((row) => row.id));
  return {
    items: rows.map((row) => toRow(row, totals.get(row.id) ?? EMPTY_TOTALS, now)),
    page,
    pageSize,
    total,
  };
}

export async function getRelease(id: string): Promise<AdminReleaseDetail> {
  return toDetail(await loadDetail(prisma, id), new Date());
}

export async function getLiveRelease(now: Date): Promise<LiveRelease | null> {
  const where: Prisma.ReleaseWhereInput = {
    AND: [openWhere(now), { hidden: false }, { allocations: { some: { variant: { product: { deletedAt: null } } } } }],
  };
  const [row, count] = await prisma.$transaction([
    prisma.release.findFirst({
      where,
      select: { id: true, title: true, edition: true, startsAt: true, endsAt: true },
      orderBy: [{ startsAt: "desc" }, { id: "desc" }],
    }),
    prisma.release.count({ where }),
  ]);
  if (!row) return null;
  const totals = (await totalsFor(prisma, [row.id])).get(row.id) ?? EMPTY_TOTALS;
  return {
    ...totals,
    id: row.id,
    title: row.title,
    edition: row.edition,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    otherLive: Math.max(0, count - 1),
  };
}

/* ---------- writes ---------- */

export async function createRelease(data: ReleaseData): Promise<AdminReleaseDetail> {
  const row = await prisma.release.create({
    data: {
      slug: newSlug(data.title),
      title: data.title,
      edition: data.edition,
      description: data.description,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
      maxPerCustomer: data.maxPerCustomer,
      reminderOffsetsMinutes: RELEASE_REMINDER_DEFAULTS_MINUTES,
      hidden: data.hidden,
      active: !data.hidden,
    },
    select: detailSelect,
  });
  return toDetail(row, new Date());
}

const sameTime = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

function lockedFieldErrors(current: DetailRow, next: ReleaseData, status: ReleaseStatus, now: Date) {
  const edits = allowedEdits(status);
  const message = `Locked while the release is ${RELEASE_STATUS_LABELS[status].toLowerCase()}.`;
  const startsAt = new Date(next.startsAt);
  const endsAt = next.endsAt ? new Date(next.endsAt) : null;
  const changed = {
    title: next.title !== current.title,
    edition: next.edition !== current.edition,
    description: next.description !== current.description,
    hidden: next.hidden !== current.hidden,
    maxPerCustomer: next.maxPerCustomer !== current.maxPerCustomer,
    startsAt: !sameTime(startsAt, current.startsAt),
    endsAt: !sameTime(endsAt, current.endsAt),
  };
  const allowed: Record<keyof typeof changed, boolean> = {
    title: edits.text,
    edition: edits.text,
    description: edits.text,
    hidden: edits.hidden,
    maxPerCustomer: edits.maxPerCustomer,
    startsAt: edits.startsAt,
    endsAt: edits.endsAt,
  };
  const fields: Record<string, string[]> = {};
  for (const key of Object.keys(changed) as (keyof typeof changed)[]) {
    if (changed[key] && !allowed[key]) fields[key] = [message];
  }
  if (changed.endsAt && allowed.endsAt && status !== "DRAFT") {
    if (!endsAt) fields.endsAt = ["A published release needs an end time."];
    else if (status !== "UPCOMING" && endsAt <= now) {
      fields.endsAt = ["Pick an end time in the future. Use End release to close it now."];
    }
  }
  return fields;
}

export async function updateRelease(id: string, data: ReleaseData): Promise<AdminReleaseDetail> {
  await prisma.$transaction(
    async (tx) => {
      if (!(await lockRelease(tx, id))) throw notFound();
      const current = await loadDetail(tx, id);
      const now = new Date();
      const status = toDetail(current, now).status;
      const fields = lockedFieldErrors(current, data, status, now);
      if (Object.keys(fields).length > 0) {
        throw new ServiceError("VALIDATION", "Some fields can't change at this stage.", 422, fields);
      }
      await tx.release.update({
        where: { id },
        data: {
          title: data.title,
          edition: data.edition,
          description: data.description,
          startsAt: new Date(data.startsAt),
          endsAt: data.endsAt ? new Date(data.endsAt) : null,
          maxPerCustomer: data.maxPerCustomer,
          hidden: data.hidden,
          active: !data.hidden,
        },
      });
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );
  return getRelease(id);
}

export async function deleteRelease(id: string) {
  await prisma.$transaction(
    async (tx) => {
      if (!(await lockRelease(tx, id))) throw notFound();
      const current = await loadDetail(tx, id);
      if (!canDeleteRelease(toDetail(current, new Date()).status)) {
        throw new ServiceError("CONFLICT", "Only a draft or upcoming release can be deleted. End it instead.", 409);
      }
      const ordered = await tx.orderItem.count({ where: { releaseId: id } });
      if (ordered > 0) {
        throw new ServiceError("CONFLICT", "This release has orders, so it can't be deleted.", 409);
      }
      const toReturn = current.allocations
        .filter((allocation) => allocation.available > 0)
        .sort((a, b) => (a.variantId < b.variantId ? -1 : 1));
      for (const allocation of toReturn) {
        await tx.productVariant.update({
          where: { id: allocation.variantId },
          data: { stock: { increment: allocation.available } },
        });
      }
      await tx.release.delete({ where: { id } });
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );
  return { id };
}

const STATE_CONFLICT: Record<ReleaseStateAction, string> = {
  PUBLISH: "Only a draft can be published.",
  UNPUBLISH: "Only an upcoming release can go back to draft.",
  END: "Only an upcoming, live or sold out release can be ended.",
};

export async function changeReleaseState(id: string, action: ReleaseStateAction): Promise<AdminReleaseDetail> {
  await prisma.$transaction(
    async (tx) => {
      if (!(await lockRelease(tx, id))) throw notFound();
      const current = await loadDetail(tx, id);
      const now = new Date();
      const detail = toDetail(current, now);
      if (!canChangeState(detail.status, action)) throw new ServiceError("CONFLICT", STATE_CONFLICT[action], 409);

      if (action === "PUBLISH") {
        const blocker = publishBlocker({ ...current, totalAllocated: detail.allocated }, now);
        if (blocker) throw new ServiceError("VALIDATION", blocker, 422);
        await tx.release.update({ where: { id }, data: { publishedAt: now } });
      } else if (action === "UNPUBLISH") {
        await tx.release.update({ where: { id }, data: { publishedAt: null } });
      } else {
        await tx.release.update({ where: { id }, data: endedWindow(current.startsAt, now) });
      }
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );
  return getRelease(id);
}
