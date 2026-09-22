import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { imageUrlOrNull } from "@/lib/storage/image-storage";
import type { brandListQuerySchema, brandSchema } from "@/validators/brand.validator";
import { releaseImage } from "./media.service";

/**
 * Brands for the console. Flat, so the only rules are name uniqueness and
 * releasing an image once nothing points at it.
 *
 * There is deliberately no delete block: the issue asks for one when a brand
 * is linked to active products, and there is no Product model yet. The check
 * belongs here when there is.
 */

type Tx = Prisma.TransactionClient;
type BrandData = z.output<typeof brandSchema>;
type BrandQuery = z.output<typeof brandListQuerySchema>;

const brandSelect = {
  id: true,
  name: true,
  imageId: true,
  updatedAt: true,
} satisfies Prisma.BrandSelect;

type BrandRow = Prisma.BrandGetPayload<{ select: typeof brandSelect }>;

const nameKeyOf = (name: string) => name.trim().toLowerCase();

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that brand. It may have been deleted.", 404);

function toListItem(row: BrandRow) {
  return {
    id: row.id,
    name: row.name,
    imageUrl: imageUrlOrNull(row.imageId),
    updatedAt: row.updatedAt,
  };
}

/* ---------- reads ---------- */

export async function listBrands({ page, pageSize, search }: BrandQuery) {
  const where: Prisma.BrandWhereInput = search
    ? { name: { contains: search, mode: "insensitive" } }
    : {};

  const [rows, total] = await prisma.$transaction([
    prisma.brand.findMany({
      where,
      select: brandSelect,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.brand.count({ where }),
  ]);

  return { items: rows.map(toListItem), page, pageSize, total };
}

export async function getBrand(id: string) {
  const row = await prisma.brand.findUnique({ where: { id }, select: brandSelect });
  if (!row) throw notFound();

  return { ...toListItem(row), imageId: row.imageId };
}

/* ---------- writes ---------- */

export async function createBrand(data: BrandData) {
  const id = await prisma.$transaction(async (tx) => {
    await assertNameFree(tx, nameKeyOf(data.name));

    const created = await tx.brand.create({
      data: { name: data.name, nameKey: nameKeyOf(data.name), imageId: data.imageId },
      select: { id: true },
    });
    return created.id;
  });

  return getBrand(id);
}

export async function updateBrand(id: string, data: BrandData) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.brand.findUnique({ where: { id }, select: { imageId: true } });
    if (!current) throw notFound();

    await assertNameFree(tx, nameKeyOf(data.name), id);

    await tx.brand.update({
      where: { id },
      data: { name: data.name, nameKey: nameKeyOf(data.name), imageId: data.imageId },
    });

    if (current.imageId !== null && current.imageId !== data.imageId) {
      await releaseImage(tx, current.imageId);
    }
  });

  return getBrand(id);
}

export async function deleteBrand(id: string) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.brand.findUnique({ where: { id }, select: { imageId: true } });
    if (!current) throw notFound();

    await tx.brand.delete({ where: { id } });
    if (current.imageId !== null) await releaseImage(tx, current.imageId);
  });

  return { id };
}

/* ---------- rules ---------- */

async function assertNameFree(tx: Tx, nameKey: string, exceptId?: string) {
  const owner = await tx.brand.findUnique({ where: { nameKey }, select: { id: true } });
  if (owner && owner.id !== exceptId) {
    const message = "A brand with this name already exists.";
    throw new ServiceError("CONFLICT", message, 409, { name: [message] });
  }
}
