import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { couponStatus } from "@/lib/pricing/coupon";
import type { couponListQuerySchema, couponSchema } from "@/validators/coupon.validator";

type Tx = Prisma.TransactionClient;
type CouponData = z.output<typeof couponSchema>;
type CouponQuery = z.output<typeof couponListQuerySchema>;

const couponSelect = {
  id: true,
  code: true,
  description: true,
  type: true,
  value: true,
  minOrderAmount: true,
  startsAt: true,
  endsAt: true,
  active: true,
  usageLimit: true,
  perCustomerLimit: true,
  redemptionCount: true,
  appliesToAll: true,
  createdAt: true,
  updatedAt: true,
  products: {
    select: { product: { select: { id: true, name: true } } },
    orderBy: { product: { name: "asc" } },
  },
  categories: {
    select: { category: { select: { id: true, name: true } } },
    orderBy: { category: { name: "asc" } },
  },
} satisfies Prisma.CouponSelect;

type CouponRow = Prisma.CouponGetPayload<{ select: typeof couponSelect }>;

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that code. It may have been deleted.", 404);

function toItem(row: CouponRow, now: Date) {
  const products = row.products.map((link) => link.product);
  const categories = row.categories.map((link) => link.category);
  const status = couponStatus(
    {
      ...row,
      productIds: products.map((product) => product.id),
      categoryIds: categories.map((category) => category.id),
    },
    now,
  );
  return { ...row, products, categories, status };
}

function targetsOf(data: CouponData) {
  if (data.appliesToAll) return { productIds: [], categoryIds: [] };
  return { productIds: [...new Set(data.productIds)], categoryIds: [...new Set(data.categoryIds)] };
}

/* ---------- reads ---------- */

export async function listCoupons({ page, pageSize, search, active }: CouponQuery) {
  const where: Prisma.CouponWhereInput = {
    ...(active === undefined ? {} : { active }),
    ...(search ? { code: { contains: search, mode: "insensitive" } } : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.coupon.findMany({
      where,
      select: couponSelect,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.coupon.count({ where }),
  ]);

  const now = new Date();
  return { items: rows.map((row) => toItem(row, now)), page, pageSize, total };
}

export async function getCoupon(id: string) {
  const row = await prisma.coupon.findUnique({ where: { id }, select: couponSelect });
  if (!row) throw notFound();
  return toItem(row, new Date());
}

/* ---------- writes ---------- */

export async function createCoupon(data: CouponData) {
  const { productIds, categoryIds } = targetsOf(data);

  const id = await prisma.$transaction(async (tx) => {
    await assertCodeFree(tx, data.code);
    await assertTargetsExist(tx, productIds, categoryIds);
    const created = await tx.coupon.create({
      data: {
        ...couponFields(data),
        products: { create: productIds.map((productId) => ({ productId })) },
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
      select: { id: true },
    });
    return created.id;
  });

  return getCoupon(id);
}

export async function updateCoupon(id: string, data: CouponData) {
  const { productIds, categoryIds } = targetsOf(data);

  await prisma.$transaction(async (tx) => {
    const current = await tx.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!current) throw notFound();

    await assertCodeFree(tx, data.code, id);
    await assertTargetsExist(tx, productIds, categoryIds);
    await tx.couponProduct.deleteMany({ where: { couponId: id } });
    await tx.couponCategory.deleteMany({ where: { couponId: id } });
    await tx.coupon.update({
      where: { id },
      data: {
        ...couponFields(data),
        products: { create: productIds.map((productId) => ({ productId })) },
        categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
    });
  });

  return getCoupon(id);
}

export async function deleteCoupon(id: string) {
  const { count } = await prisma.coupon.deleteMany({ where: { id } });
  if (count === 0) throw notFound();
  return { id };
}

/* ---------- mapping and rules ---------- */

function couponFields(data: CouponData) {
  return {
    code: data.code,
    description: data.description,
    type: data.type,
    value: data.value,
    minOrderAmount: data.minOrderAmount,
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    active: data.active,
    usageLimit: data.usageLimit,
    perCustomerLimit: data.perCustomerLimit,
    appliesToAll: data.appliesToAll,
  };
}

async function assertCodeFree(tx: Tx, code: string, exceptId?: string) {
  const owner = await tx.coupon.findUnique({ where: { code }, select: { id: true } });
  if (owner && owner.id !== exceptId) {
    const message = "That code is already in use.";
    throw new ServiceError("CONFLICT", message, 409, { code: [message] });
  }
}

async function assertTargetsExist(tx: Tx, productIds: string[], categoryIds: string[]) {
  if (productIds.length > 0) {
    const found = await tx.product.count({ where: { id: { in: productIds } } });
    if (found !== productIds.length) {
      const message = "One of the products no longer exists.";
      throw new ServiceError("VALIDATION", message, 422, { productIds: [message] });
    }
  }

  if (categoryIds.length > 0) {
    const found = await tx.category.count({ where: { id: { in: categoryIds } } });
    if (found !== categoryIds.length) {
      const message = "One of the categories no longer exists.";
      throw new ServiceError("VALIDATION", message, 422, { categoryIds: [message] });
    }
  }
}
