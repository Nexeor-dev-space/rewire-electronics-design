import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import type { addOnListQuerySchema, addOnSchema } from "@/validators/add-on.validator";

type Tx = Prisma.TransactionClient;
type AddOnData = z.output<typeof addOnSchema>;
type AddOnQuery = z.output<typeof addOnListQuerySchema>;

const addOnSelect = {
  id: true,
  name: true,
  note: true,
  kind: true,
  price: true,
  popular: true,
  active: true,
  appliesToAll: true,
  updatedAt: true,
  categories: {
    select: { category: { select: { id: true, name: true } } },
    orderBy: { category: { name: "asc" } },
  },
} satisfies Prisma.AddOnSelect;

type AddOnRow = Prisma.AddOnGetPayload<{ select: typeof addOnSelect }>;

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that add-on. It may have been deleted.", 404);

function toItem(row: AddOnRow) {
  return { ...row, categories: row.categories.map((link) => link.category) };
}

const categoryIdsOf = (data: AddOnData) =>
  data.appliesToAll ? [] : [...new Set(data.categoryIds)];

/* ---------- reads ---------- */

export async function listAddOns({ page, pageSize, search, kind, active }: AddOnQuery) {
  const where: Prisma.AddOnWhereInput = {
    ...(kind ? { kind } : {}),
    ...(active === undefined ? {} : { active }),
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.addOn.findMany({
      where,
      select: addOnSelect,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.addOn.count({ where }),
  ]);

  return { items: rows.map(toItem), page, pageSize, total };
}

export async function getAddOn(id: string) {
  const row = await prisma.addOn.findUnique({ where: { id }, select: addOnSelect });
  if (!row) throw notFound();
  return toItem(row);
}

/* ---------- writes ---------- */

export async function createAddOn(data: AddOnData) {
  const categoryIds = categoryIdsOf(data);

  const id = await prisma.$transaction(async (tx) => {
    await assertCategoriesExist(tx, categoryIds);
    const created = await tx.addOn.create({
      data: {
        ...addOnFields(data),
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
      select: { id: true },
    });
    return created.id;
  });

  return getAddOn(id);
}

export async function updateAddOn(id: string, data: AddOnData) {
  const categoryIds = categoryIdsOf(data);

  await prisma.$transaction(async (tx) => {
    const current = await tx.addOn.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw notFound();

    await assertCategoriesExist(tx, categoryIds);
    await tx.addOnCategory.deleteMany({ where: { addOnId: id } });
    await tx.addOn.update({
      where: { id },
      data: {
        ...addOnFields(data),
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
  });

  return getAddOn(id);
}

export async function deleteAddOn(id: string) {
  const { count } = await prisma.addOn.deleteMany({ where: { id } });
  if (count === 0) throw notFound();
  return { id };
}

/* ---------- mapping and rules ---------- */

function addOnFields(data: AddOnData) {
  return {
    name: data.name,
    note: data.note,
    kind: data.kind,
    price: data.price,
    popular: data.popular,
    active: data.active,
    appliesToAll: data.appliesToAll,
  };
}

async function assertCategoriesExist(tx: Tx, categoryIds: string[]) {
  if (categoryIds.length === 0) return;

  const found = await tx.category.count({ where: { id: { in: categoryIds } } });
  if (found !== categoryIds.length) {
    const message = "One of the categories no longer exists.";
    throw new ServiceError("VALIDATION", message, 422, { categoryIds: [message] });
  }
}
