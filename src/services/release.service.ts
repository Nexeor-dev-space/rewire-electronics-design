import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { releaseStatus } from "@/lib/releases";
import type { LiveRelease } from "@/types/release";
import type { releaseListQuerySchema, releaseSchema } from "@/validators/release.validator";

type ReleaseData = z.output<typeof releaseSchema>;
type ReleaseQuery = z.output<typeof releaseListQuerySchema>;

const releaseSelect = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  product: { select: { id: true, name: true } },
} satisfies Prisma.ReleaseSelect;

type ReleaseRow = Prisma.ReleaseGetPayload<{ select: typeof releaseSelect }>;

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that release. It may have been deleted.", 404);

function toItem(row: ReleaseRow, now: Date) {
  return { ...row, status: releaseStatus(row, now) };
}

function releaseFields(data: ReleaseData) {
  return {
    title: data.title,
    productId: data.productId,
    startsAt: new Date(data.startsAt),
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    active: data.active,
  };
}

async function assertProductExists(productId: string) {
  const found = await prisma.product.count({ where: { id: productId, deletedAt: null } });
  if (found === 0) {
    const message = "That product no longer exists.";
    throw new ServiceError("VALIDATION", message, 422, { productId: [message] });
  }
}

/* ---------- reads ---------- */

export async function listReleases({ page, pageSize, search }: ReleaseQuery) {
  const where: Prisma.ReleaseWhereInput = search ? { title: { contains: search, mode: "insensitive" } } : {};

  const [rows, total] = await prisma.$transaction([
    prisma.release.findMany({
      where,
      select: releaseSelect,
      orderBy: [{ startsAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.release.count({ where }),
  ]);

  const now = new Date();
  return { items: rows.map((row) => toItem(row, now)), page, pageSize, total };
}

export async function getRelease(id: string) {
  const row = await prisma.release.findUnique({ where: { id }, select: releaseSelect });
  if (!row) throw notFound();
  return toItem(row, new Date());
}

export async function getLiveRelease(now: Date): Promise<LiveRelease | null> {
  const row = await prisma.release.findFirst({
    where: {
      active: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      product: { deletedAt: null },
    },
    select: { id: true, title: true, startsAt: true, endsAt: true, product: { select: { name: true } } },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    productName: row.product.name,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
  };
}

/* ---------- writes ---------- */

export async function createRelease(data: ReleaseData) {
  await assertProductExists(data.productId);
  const row = await prisma.release.create({ data: releaseFields(data), select: releaseSelect });
  return toItem(row, new Date());
}

export async function updateRelease(id: string, data: ReleaseData) {
  await assertProductExists(data.productId);
  const { count } = await prisma.release.updateMany({ where: { id }, data: releaseFields(data) });
  if (count === 0) throw notFound();
  return getRelease(id);
}

export async function deleteRelease(id: string) {
  const { count } = await prisma.release.deleteMany({ where: { id } });
  if (count === 0) throw notFound();
  return { id };
}
