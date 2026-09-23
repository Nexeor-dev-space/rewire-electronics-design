import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { fromShopCondition, fromShopGrade, toShopCondition, toShopGrade } from "@/lib/catalogue";
import {
  MAX_PRODUCT_ADD_ONS,
  NAV_CATEGORY_LIMIT,
  RELATED_PRODUCTS_LIMIT,
  SITEMAP_PRODUCT_LIMIT,
  STOREFRONT_CATEGORIES_REVALIDATE_SECONDS,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { priceBands, type PriceBand } from "@/lib/shop";
import { imageUrl, imageUrlOrNull } from "@/lib/storage/image-storage";
import type { SpecGroup } from "@/types/commerce";
import type {
  ShopAddOn,
  ShopCard,
  ShopCategoryRef,
  ShopFacets,
  ShopListing,
  ShopProductDetail,
  ShopProductPage,
  ShopVariant,
  StorefrontCategory,
} from "@/types/catalogue";
import type { shopQuerySchema } from "@/validators/catalogue.validator";

type ShopQuery = z.output<typeof shopQuerySchema>;
type Axis = "category" | "condition" | "grade" | "brand" | "storage" | "price";

export const CATALOGUE_CACHE_TAG = "catalogue";

export function refreshStorefrontCatalogue() {
  revalidateTag(CATALOGUE_CACHE_TAG);
}

const VISIBLE_CATEGORY: Prisma.CategoryWhereInput = {
  status: "PUBLISHED",
  OR: [{ parentId: null }, { parent: { is: { status: "PUBLISHED" } } }],
};

const PUBLISHED: Prisma.ProductWhereInput = { status: "PUBLISHED", category: VISIBLE_CATEGORY };

const ORDER_BY: Record<ShopQuery["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ publishedAt: "desc" }, { id: "asc" }],
  "price-asc": [{ minPrice: "asc" }, { id: "asc" }],
  "price-desc": [{ minPrice: "desc" }, { id: "asc" }],
};

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  highlights: true,
  publishedAt: true,
  minPrice: true,
  brand: { select: { name: true } },
  category: { select: { slug: true } },
  images: { select: { mediaId: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
  variants: {
    select: {
      condition: true,
      grade: true,
      price: true,
      compareAtPrice: true,
      storage: true,
      colour: true,
      stock: true,
    },
    orderBy: [{ price: "asc" }, { sortOrder: "asc" }],
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

const detailSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
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
      parent: { select: { id: true, name: true, slug: true } },
    },
  },
  images: { select: { mediaId: true, alt: true, colour: true }, orderBy: { sortOrder: "asc" } },
  specs: { select: { group: true, label: true, value: true }, orderBy: { sortOrder: "asc" } },
  variants: {
    select: {
      id: true,
      sku: true,
      condition: true,
      grade: true,
      batteryHealth: true,
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

function variantFilters(query: ShopQuery, except?: Axis): Prisma.ProductVariantWhereInput[] {
  const and: Prisma.ProductVariantWhereInput[] = [];
  if (except !== "condition" && query.condition.length > 0) {
    and.push({ condition: { in: query.condition.map(fromShopCondition) } });
  }
  if (except !== "grade" && query.grade.length > 0) {
    and.push({ grade: { in: query.grade.map(fromShopGrade) } });
  }
  if (except !== "storage" && query.storage.length > 0) {
    and.push({ storage: { in: query.storage } });
  }
  return and;
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
  const variants = variantFilters(query, except);
  if (variants.length > 0) {
    and.push({ variants: { some: { AND: variants } } });
  }
  if (except !== "brand" && query.brand.length > 0) {
    and.push({
      OR: query.brand.map((name) => ({ brand: { name: { equals: name, mode: "insensitive" } } })),
    });
  }
  if (except !== "price" && query.price.length > 0) {
    const bands = priceBands.filter((band) => query.price.includes(band.id));
    and.push({ OR: bands.map(bandWhere) });
  }

  return { AND: and };
}

/* ---------- mapping ---------- */

type CardVariant = CardRow["variants"][number];

function matchesVariantFilters(variant: CardVariant, query: ShopQuery) {
  return (
    (query.condition.length === 0 || query.condition.includes(toShopCondition(variant.condition))) &&
    (query.grade.length === 0 ||
      (variant.grade !== null && query.grade.includes(toShopGrade(variant.grade)))) &&
    (query.storage.length === 0 ||
      (variant.storage !== null && query.storage.includes(variant.storage)))
  );
}

function toCard(row: CardRow, query?: ShopQuery): ShopCard {
  const shown =
    (query && row.variants.find((variant) => matchesVariantFilters(variant, query))) ??
    row.variants[0];
  const image = row.images[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand.name,
    category: row.category.slug,
    condition: toShopCondition(shown.condition),
    grade: shown.grade ? toShopGrade(shown.grade) : null,
    keySpec: row.highlights[0] ?? "",
    storage: shown.storage,
    variant: shown.colour,
    price: shown.price,
    originalPrice: shown.compareAtPrice,
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

function toVariant({ condition, grade, ...variant }: DetailRow["variants"][number]): ShopVariant {
  return {
    ...variant,
    condition: toShopCondition(condition),
    grade: grade ? toShopGrade(grade) : null,
  };
}

function toDetail(row: DetailRow): ShopProductDetail {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    brand: row.brand.name,
    category: row.category,
    warrantyMonths: row.warrantyMonths,
    highlights: row.highlights,
    included: row.included,
    images: row.images.map((image) => ({
      id: image.mediaId,
      url: imageUrl(image.mediaId),
      alt: image.alt || `${row.brand.name} ${row.name}`,
      colour: image.colour,
    })),
    specs: groupSpecs(row.specs),
    variants: row.variants.map(toVariant),
    listedAt: row.publishedAt?.toISOString() ?? null,
  };
}

/* ---------- facets ---------- */

const storageBytes = (label: string) =>
  parseFloat(label) * (label.toUpperCase().includes("TB") ? 1024 : 1);

function tally<K>(values: (K | null)[]): Map<K, number> {
  const counts = new Map<K, number>();
  for (const value of values) {
    if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

const variantFacetWhere = (query: ShopQuery, axis: Axis): Prisma.ProductVariantWhereInput => ({
  AND: variantFilters(query, axis),
  product: whereFor(query, axis),
});

async function facetsFor(query: ShopQuery): Promise<ShopFacets> {
  const [categories, conditionPairs, gradePairs, brands, storagePairs, bandCounts] =
    await Promise.all([
      prisma.category.findMany({
        where: VISIBLE_CATEGORY,
        select: {
          name: true,
          slug: true,
          parent: { select: { slug: true } },
          _count: { select: { products: { where: whereFor(query, "category") } } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.productVariant.groupBy({
        by: ["condition", "productId"],
        where: variantFacetWhere(query, "condition"),
      }),
      prisma.productVariant.groupBy({
        by: ["grade", "productId"],
        where: { ...variantFacetWhere(query, "grade"), grade: { not: null } },
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
        where: { ...variantFacetWhere(query, "storage"), storage: { not: null } },
      }),
      Promise.all(
        priceBands.map((band) =>
          prisma.product.count({ where: { AND: [whereFor(query, "price"), bandWhere(band)] } }),
        ),
      ),
    ]);

  const storageCounts = tally(storagePairs.map((pair) => pair.storage));

  return {
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      parentSlug: category.parent?.slug ?? null,
      count: category._count.products,
    })),
    conditions: Object.fromEntries(
      [...tally(conditionPairs.map((pair) => pair.condition))].map(([condition, count]) => [
        toShopCondition(condition),
        count,
      ]),
    ),
    grades: Object.fromEntries(
      [...tally(gradePairs.map((pair) => pair.grade))].map(([grade, count]) => [
        toShopGrade(grade),
        count,
      ]),
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

  return { items: rows.map((row) => toCard(row, query)), page, pageSize, total, facets };
}

async function findShopProduct(slug: string): Promise<ShopProductDetail | null> {
  const row = await prisma.product.findFirst({
    where: { slug, ...PUBLISHED },
    select: detailSelect,
  });
  return row ? toDetail(row) : null;
}

async function listRelatedShopProducts(product: ShopProductDetail, limit: number) {
  const rows = await prisma.product.findMany({
    where: { ...PUBLISHED, categoryId: product.category.id, id: { not: product.id } },
    select: cardSelect,
    orderBy: ORDER_BY.newest,
    take: limit,
  });
  return rows.map((row) => toCard(row));
}

export async function listNewestShopProducts(limit: number) {
  const rows = await prisma.product.findMany({
    where: { ...PUBLISHED, variants: { some: { stock: { gt: 0 } } } },
    select: cardSelect,
    orderBy: ORDER_BY.newest,
    take: limit,
  });
  return rows.map((row) => toCard(row));
}

async function listShopAddOns(category: ShopCategoryRef): Promise<ShopAddOn[]> {
  const categoryIds = [category.id, ...(category.parent ? [category.parent.id] : [])];
  const rows = await prisma.addOn.findMany({
    where: {
      active: true,
      OR: [{ appliesToAll: true }, { categories: { some: { categoryId: { in: categoryIds } } } }],
    },
    select: { id: true, name: true, note: true, kind: true, price: true, popular: true },
    orderBy: [{ kind: "asc" }, { popular: "desc" }, { price: "asc" }],
    take: MAX_PRODUCT_ADD_ONS,
  });

  return rows.map((row) => ({
    id: row.id,
    label: row.name,
    note: row.note,
    price: row.price,
    kind: row.kind.toLowerCase() as ShopAddOn["kind"],
    popular: row.popular,
  }));
}

export async function findShopProductPage(slug: string): Promise<ShopProductPage | null> {
  const product = await findShopProduct(slug);
  if (!product) return null;

  const [addOns, related] = await Promise.all([
    listShopAddOns(product.category),
    listRelatedShopProducts(product, RELATED_PRODUCTS_LIMIT),
  ]);
  return { ...product, addOns, related };
}

export async function listSitemapEntries() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: PUBLISHED,
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: SITEMAP_PRODUCT_LIMIT,
    }),
    prisma.category.findMany({
      where: { ...VISIBLE_CATEGORY, products: { some: PUBLISHED } },
      select: { slug: true, updatedAt: true },
    }),
  ]);
  return { products, categories };
}

export async function findShopCategory(slug: string) {
  return prisma.category.findFirst({
    where: { slug, ...VISIBLE_CATEGORY },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      parent: { select: { name: true, slug: true } },
    },
  });
}

async function readStorefrontCategories(): Promise<StorefrontCategory[]> {
  const [categories, groups] = await Promise.all([
    prisma.category.findMany({
      where: { status: "PUBLISHED", parentId: null, showInNav: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageId: true,
        children: { where: { status: "PUBLISHED" }, select: { id: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: NAV_CATEGORY_LIMIT,
    }),
    prisma.product.groupBy({
      by: ["categoryId", "brandId"],
      where: { ...PUBLISHED, variants: { some: { stock: { gt: 0 } } } },
      _count: { _all: true },
    }),
  ]);

  const brands = await prisma.brand.findMany({
    where: { id: { in: [...new Set(groups.map((group) => group.brandId))] } },
    select: { id: true, name: true },
  });
  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));

  return categories.map((category) => {
    const ids = new Set([category.id, ...category.children.map((child) => child.id)]);
    const perBrand = new Map<string, number>();
    for (const group of groups) {
      const name = brandNames.get(group.brandId);
      if (!ids.has(group.categoryId) || !name) continue;
      perBrand.set(name, (perBrand.get(name) ?? 0) + group._count._all);
    }
    const counts = [...perBrand]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: imageUrlOrNull(category.imageId),
      productCount: counts.reduce((sum, brand) => sum + brand.count, 0),
      brands: counts,
    };
  });
}

export const listStorefrontCategories = unstable_cache(
  readStorefrontCategories,
  ["catalogue", "storefront-categories"],
  { tags: [CATALOGUE_CACHE_TAG], revalidate: STOREFRONT_CATEGORIES_REVALIDATE_SECONDS },
);
