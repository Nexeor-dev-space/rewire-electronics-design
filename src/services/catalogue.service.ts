import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { fromShopCondition, fromShopGrade, toShopCondition, toShopGrade } from "@/lib/catalogue";
import { prisma } from "@/lib/db";
import { priceBands, type PriceBand } from "@/lib/shop";
import { imageUrl, imageUrlOrNull } from "@/lib/storage/image-storage";
import type { SpecGroup } from "@/types/commerce";
import type { ShopCard, ShopFacets, ShopListing, ShopProductDetail } from "@/types/catalogue";
import type { shopQuerySchema } from "@/validators/catalogue.validator";

type ShopQuery = z.output<typeof shopQuerySchema>;
type Axis = "category" | "condition" | "grade" | "brand" | "storage" | "price";

const PUBLISHED = { status: "PUBLISHED" } as const;

const ORDER_BY: Record<ShopQuery["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  recommended: [{ publishedAt: "desc" }, { id: "asc" }],
  newest: [{ publishedAt: "desc" }, { id: "asc" }],
  "price-asc": [{ minPrice: "asc" }, { id: "asc" }],
  "price-desc": [{ minPrice: "desc" }, { id: "asc" }],
};

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  condition: true,
  grade: true,
  highlights: true,
  publishedAt: true,
  minPrice: true,
  brand: { select: { name: true } },
  category: { select: { slug: true } },
  images: { select: { mediaId: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
  variants: {
    select: { price: true, compareAtPrice: true, storage: true, colour: true, stock: true },
    orderBy: [{ price: "asc" }, { sortOrder: "asc" }],
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

const detailSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  condition: true,
  grade: true,
  batteryHealth: true,
  warrantyMonths: true,
  highlights: true,
  included: true,
  publishedAt: true,
  brand: { select: { name: true } },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      parent: { select: { name: true, slug: true } },
    },
  },
  images: { select: { mediaId: true, alt: true }, orderBy: { sortOrder: "asc" } },
  specs: { select: { group: true, label: true, value: true }, orderBy: { sortOrder: "asc" } },
  variants: {
    select: {
      id: true,
      storage: true,
      colour: true,
      colourHex: true,
      price: true,
      compareAtPrice: true,
      stock: true,
    },
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.ProductSelect;

type DetailRow = Prisma.ProductGetPayload<{ select: typeof detailSelect }>;

/* ---------- filters ---------- */

function bandWhere(band: PriceBand): Prisma.ProductWhereInput {
  return {
    minPrice: { gte: band.min, ...(Number.isFinite(band.max) ? { lt: band.max } : {}) },
  };
}

function whereFor(query: ShopQuery, except?: Axis): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [PUBLISHED];

  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { brand: { name: { contains: query.q, mode: "insensitive" } } },
        { category: { name: { contains: query.q, mode: "insensitive" } } },
      ],
    });
  }
  if (except !== "category" && query.category.length > 0) {
    and.push({
      category: {
        OR: [{ slug: { in: query.category } }, { parent: { slug: { in: query.category } } }],
      },
    });
  }
  if (except !== "condition" && query.condition.length > 0) {
    and.push({ condition: { in: query.condition.map(fromShopCondition) } });
  }
  if (except !== "grade" && query.grade.length > 0) {
    and.push({ grade: { in: query.grade.map(fromShopGrade) } });
  }
  if (except !== "brand" && query.brand.length > 0) {
    and.push({
      OR: query.brand.map((name) => ({ brand: { name: { equals: name, mode: "insensitive" } } })),
    });
  }
  if (except !== "storage" && query.storage.length > 0) {
    and.push({ variants: { some: { storage: { in: query.storage } } } });
  }
  if (except !== "price" && query.price.length > 0) {
    const bands = priceBands.filter((band) => query.price.includes(band.id));
    and.push({ OR: bands.map(bandWhere) });
  }

  return { AND: and };
}

/* ---------- mapping ---------- */

function toCard(row: CardRow): ShopCard {
  const cheapest = row.variants[0];
  const image = row.images[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand.name,
    category: row.category.slug,
    condition: toShopCondition(row.condition),
    grade: row.grade ? toShopGrade(row.grade) : null,
    keySpec: row.highlights[0] ?? "",
    storage: cheapest?.storage ?? null,
    variant: cheapest?.colour ?? null,
    price: row.minPrice,
    originalPrice: cheapest?.compareAtPrice ?? null,
    imageUrl: imageUrlOrNull(image?.mediaId ?? null),
    imageAlt: image?.alt || `${row.brand.name} ${row.name}`,
    stock: row.variants.reduce((sum, variant) => sum + variant.stock, 0),
    optionCount: row.variants.length,
    listedAt: row.publishedAt?.toISOString() ?? null,
  };
}

function groupSpecs(specs: DetailRow["specs"]): SpecGroup[] {
  const groups: SpecGroup[] = [];
  for (const spec of specs) {
    const group = groups.find((entry) => entry.title === spec.group);
    const row = { label: spec.label, value: spec.value };
    if (group) group.rows.push(row);
    else groups.push({ title: spec.group, rows: [row] });
  }
  return groups;
}

function toDetail(row: DetailRow): ShopProductDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    brand: row.brand.name,
    category: row.category,
    condition: toShopCondition(row.condition),
    grade: row.grade ? toShopGrade(row.grade) : null,
    batteryHealth: row.batteryHealth,
    warrantyMonths: row.warrantyMonths,
    highlights: row.highlights,
    included: row.included,
    images: row.images.map((image) => ({
      id: image.mediaId,
      url: imageUrl(image.mediaId),
      alt: image.alt || `${row.brand.name} ${row.name}`,
    })),
    specs: groupSpecs(row.specs),
    variants: row.variants,
    listedAt: row.publishedAt?.toISOString() ?? null,
  };
}

/* ---------- facets ---------- */

const storageBytes = (label: string) =>
  parseFloat(label) * (label.toUpperCase().includes("TB") ? 1024 : 1);

async function facetsFor(query: ShopQuery): Promise<ShopFacets> {
  const [categories, conditionGroups, gradeGroups, brands, storagePairs, bandCounts] =
    await Promise.all([
      prisma.category.findMany({
        select: {
          name: true,
          slug: true,
          parent: { select: { slug: true } },
          _count: { select: { products: { where: whereFor(query, "category") } } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.product.groupBy({
        by: ["condition"],
        where: whereFor(query, "condition"),
        _count: { _all: true },
      }),
      prisma.product.groupBy({
        by: ["grade"],
        where: whereFor(query, "grade"),
        _count: { _all: true },
      }),
      prisma.brand.findMany({
        where: { products: { some: PUBLISHED } },
        select: {
          name: true,
          _count: { select: { products: { where: whereFor(query, "brand") } } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.productVariant.groupBy({
        by: ["storage", "productId"],
        where: { storage: { not: null }, product: whereFor(query, "storage") },
      }),
      Promise.all(
        priceBands.map((band) =>
          prisma.product.count({ where: { AND: [whereFor(query, "price"), bandWhere(band)] } }),
        ),
      ),
    ]);

  const storageCounts = new Map<string, number>();
  for (const { storage } of storagePairs) {
    if (storage) storageCounts.set(storage, (storageCounts.get(storage) ?? 0) + 1);
  }

  return {
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      parentSlug: category.parent?.slug ?? null,
      count: category._count.products,
    })),
    conditions: Object.fromEntries(
      conditionGroups.map((group) => [toShopCondition(group.condition), group._count._all]),
    ),
    grades: Object.fromEntries(
      gradeGroups.flatMap((group) =>
        group.grade ? [[toShopGrade(group.grade), group._count._all]] : [],
      ),
    ),
    brands: brands.map((brand) => ({ value: brand.name, count: brand._count.products })),
    storage: [...storageCounts]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => storageBytes(a.value) - storageBytes(b.value)),
    priceBands: Object.fromEntries(priceBands.map((band, index) => [band.id, bandCounts[index]])),
  };
}

/* ---------- reads ---------- */

export async function listShopProducts(query: ShopQuery): Promise<ShopListing> {
  const { page, pageSize, sort } = query;
  const where = whereFor(query);

  const [rows, total, facets] = await Promise.all([
    prisma.product.findMany({
      where,
      select: cardSelect,
      orderBy: ORDER_BY[sort],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
    facetsFor(query),
  ]);

  return { items: rows.map(toCard), page, pageSize, total, facets };
}

export async function findShopProduct(slug: string): Promise<ShopProductDetail | null> {
  const row = await prisma.product.findFirst({
    where: { slug, ...PUBLISHED },
    select: detailSelect,
  });
  return row ? toDetail(row) : null;
}

export async function listRelatedShopProducts(product: ShopProductDetail, limit: number) {
  const rows = await prisma.product.findMany({
    where: { ...PUBLISHED, categoryId: product.category.id, id: { not: product.id } },
    select: cardSelect,
    orderBy: ORDER_BY.newest,
    take: limit,
  });
  return rows.map(toCard);
}

export async function listNewestShopProducts(limit: number) {
  const rows = await prisma.product.findMany({
    where: PUBLISHED,
    select: cardSelect,
    orderBy: ORDER_BY.newest,
    take: limit,
  });
  return rows.map(toCard);
}

export async function findShopCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, parent: { select: { name: true, slug: true } } },
  });
}
