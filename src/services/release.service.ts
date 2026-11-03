import "server-only";

import { randomBytes } from "node:crypto";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { RELEASE_REMINDER_DEFAULTS_MINUTES, RELEASE_SLUG_SUFFIX_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { releaseStatus } from "@/lib/releases";
import { slugify } from "@/lib/utils";
import type { LiveRelease } from "@/types/release";
import type { releaseListQuerySchema, releaseSchema } from "@/validators/release.validator";

type ReleaseData = z.output<typeof releaseSchema>;
type ReleaseQuery = z.output<typeof releaseListQuerySchema>;

const releaseSelect = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  hidden: true,
  createdAt: true,
  updatedAt: true,
  allocations: {
    take: 1,
    orderBy: { createdAt: "asc" },
    select: { variant: { select: { product: { select: { id: true, name: true } } } } },
  },
} satisfies Prisma.ReleaseSelect;

type ReleaseRow = Prisma.ReleaseGetPayload<{ select: typeof releaseSelect }>;

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that release. It may have been deleted.", 404);

function toItem({ hidden, allocations, ...row }: ReleaseRow, now: Date) {
  const window = { ...row, active: !hidden };
  return {
    ...window,
    product: allocations[0]?.variant.product ?? { id: "", name: "" },
    status: releaseStatus(window, now),
  };
}

function releaseFields(data: ReleaseData) {
  return {
    title: data.title,
    startsAt: new Date(data.startsAt),
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    productId: data.productId,
    active: data.active,
    hidden: !data.active,
  };
}

function newSlug(title: string) {
  return `${slugify(title) || "release"}-${randomBytes(RELEASE_SLUG_SUFFIX_BYTES).toString("hex")}`;
}

async function productVariantIds(productId: string) {
  const variants = await prisma.productVariant.findMany({ where: { productId }, select: { id: true } });
  return variants.map(({ id }) => ({ variantId: id }));
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
      hidden: false,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      allocations: { some: { variant: { product: { deletedAt: null } } } },
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      allocations: { take: 1, select: { variant: { select: { product: { select: { name: true } } } } } },
    },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    productName: row.allocations[0]?.variant.product.name ?? "",
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
  };
}

/* ---------- writes ---------- */

export async function createRelease(data: ReleaseData) {
  await assertProductExists(data.productId);
  const row = await prisma.release.create({
    data: {
      ...releaseFields(data),
      slug: newSlug(data.title),
      reminderOffsetsMinutes: RELEASE_REMINDER_DEFAULTS_MINUTES,
      allocations: { create: await productVariantIds(data.productId) },
    },
    select: releaseSelect,
  });
  return toItem(row, new Date());
}

export async function updateRelease(id: string, data: ReleaseData) {
  await assertProductExists(data.productId);
  const allocations = await productVariantIds(data.productId);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.release.updateMany({ where: { id }, data: releaseFields(data) });
    if (count === 0) throw notFound();
    await tx.releaseAllocation.deleteMany({ where: { releaseId: id } });
    await tx.releaseAllocation.createMany({ data: allocations.map((row) => ({ ...row, releaseId: id })) });
  });
  return getRelease(id);
}

export async function deleteRelease(id: string) {
  const { count } = await prisma.release.deleteMany({ where: { id } });
  if (count === 0) throw notFound();
  return { id };
}
