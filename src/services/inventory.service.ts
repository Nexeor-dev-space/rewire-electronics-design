import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { LOW_STOCK_THRESHOLD } from "@/types/commerce";
import type { inventoryListQuerySchema, stockUpdateSchema } from "@/validators/inventory.validator";

type InventoryQuery = z.output<typeof inventoryListQuerySchema>;
type StockData = z.output<typeof stockUpdateSchema>;

const variantSelect = {
  id: true,
  sku: true,
  condition: true,
  grade: true,
  storage: true,
  colour: true,
  price: true,
  stock: true,
  updatedAt: true,
  product: { select: { id: true, name: true, status: true } },
} satisfies Prisma.ProductVariantSelect;

const STOCK_WHERE: Record<InventoryQuery["stock"], Prisma.ProductVariantWhereInput> = {
  all: {},
  low: { stock: { gt: 0, lt: LOW_STOCK_THRESHOLD } },
  out: { stock: 0 },
};

export async function listInventory({ page, pageSize, search, stock }: InventoryQuery) {
  const where: Prisma.ProductVariantWhereInput = {
    ...STOCK_WHERE[stock],
    ...(search
      ? {
          OR: [
            { sku: { contains: search, mode: "insensitive" } },
            { product: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.productVariant.findMany({
      where,
      select: variantSelect,
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productVariant.count({ where }),
  ]);

  return { items, page, pageSize, total };
}

export async function setStock(variantId: string, { stock }: StockData) {
  const { count } = await prisma.productVariant.updateMany({
    where: { id: variantId },
    data: { stock },
  });
  if (count === 0) {
    throw new ServiceError("NOT_FOUND", "We couldn't find that variant. It may have been deleted.", 404);
  }

  return prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: variantSelect });
}
