import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { imageUrl, imageUrlOrNull } from "@/lib/storage/image-storage";
import type {
  productListQuerySchema,
  productSchema,
  productStatusSchema,
} from "@/validators/product.validator";
import { releaseImage } from "./media.service";

type Tx = Prisma.TransactionClient;
type ProductData = z.output<typeof productSchema>;
type ProductQuery = z.output<typeof productListQuerySchema>;
type ProductStatusData = z.output<typeof productStatusSchema>;
type VariantData = ProductData["variants"][number];

const WRITE_TIMEOUT_MS = 15_000;

const namedRef = { select: { id: true, name: true } } as const;

const listSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  condition: true,
  grade: true,
  updatedAt: true,
  brand: namedRef,
  category: namedRef,
  images: { select: { mediaId: true }, orderBy: { sortOrder: "asc" }, take: 1 },
  variants: { select: { price: true, stock: true } },
} satisfies Prisma.ProductSelect;

type ListRow = Prisma.ProductGetPayload<{ select: typeof listSelect }>;

const detailSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  condition: true,
  grade: true,
  batteryHealth: true,
  warrantyMonths: true,
  highlights: true,
  included: true,
  brandId: true,
  categoryId: true,
  publishedAt: true,
  updatedAt: true,
  brand: namedRef,
  category: namedRef,
  variants: {
    select: {
      id: true,
      sku: true,
      storage: true,
      colour: true,
      colourHex: true,
      price: true,
      compareAtPrice: true,
      stock: true,
    },
    orderBy: { sortOrder: "asc" },
  },
  images: { select: { mediaId: true, alt: true }, orderBy: { sortOrder: "asc" } },
  specs: { select: { group: true, label: true, value: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductSelect;

const notFound = () =>
  new ServiceError("NOT_FOUND", "We couldn't find that product. It may have been deleted.", 404);

export const productCountPhrase = (count: number) =>
  `${count} ${count === 1 ? "product" : "products"}`;

function toListItem(row: ListRow) {
  const prices = row.variants.map((variant) => variant.price);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    condition: row.condition,
    grade: row.grade,
    brand: row.brand,
    category: row.category,
    imageUrl: imageUrlOrNull(row.images[0]?.mediaId ?? null),
    variantCount: row.variants.length,
    totalStock: row.variants.reduce((sum, variant) => sum + variant.stock, 0),
    priceFrom: prices.length > 0 ? Math.min(...prices) : null,
    updatedAt: row.updatedAt,
  };
}

/* ---------- reads ---------- */

export async function listProducts({
  page,
  pageSize,
  search,
  status,
  categoryId,
  brandId,
}: ProductQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(status ? { status } : {}),
    ...(brandId ? { brandId } : {}),
    ...(categoryId ? { category: { OR: [{ id: categoryId }, { parentId: categoryId }] } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
            { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      select: listSelect,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { items: rows.map(toListItem), page, pageSize, total };
}

export async function getProduct(id: string) {
  const row = await prisma.product.findUnique({ where: { id }, select: detailSelect });
  if (!row) throw notFound();

  return {
    ...row,
    images: row.images.map((image) => ({ ...image, url: imageUrl(image.mediaId) })),
  };
}

/* ---------- writes ---------- */

export async function createProduct(data: ProductData) {
  const id = await prisma.$transaction(
    async (tx) => {
      await assertSlugFree(tx, data.slug);
      await assertSkusFree(tx, data.variants);
      await assertReferences(tx, data);

      const created = await tx.product.create({
        data: {
          ...productFields(data),
          variants: { create: data.variants.map(variantFields) },
          images: { create: data.images.map(imageFields) },
          specs: { create: data.specs.map(specFields) },
        },
        select: { id: true },
      });
      return created.id;
    },
    { timeout: WRITE_TIMEOUT_MS },
  );

  return getProduct(id);
}

export async function updateProduct(id: string, data: ProductData) {
  await prisma.$transaction(
    async (tx) => {
      const current = await tx.product.findUnique({
        where: { id },
        select: { images: { select: { mediaId: true } }, variants: { select: { id: true } } },
      });
      if (!current) throw notFound();

      await assertSlugFree(tx, data.slug, id);
      await assertSkusFree(tx, data.variants, id);
      await assertReferences(tx, data);

      const existingIds = new Set(current.variants.map((variant) => variant.id));
      if (data.variants.some((variant) => variant.id && !existingIds.has(variant.id))) {
        throw new ServiceError(
          "CONFLICT",
          "One of the variants no longer exists. Reload the product and try again.",
          409,
        );
      }

      const keptIds = data.variants.flatMap((variant) => (variant.id ? [variant.id] : []));
      await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: keptIds } } });

      for (const [index, variant] of data.variants.entries()) {
        const fields = variantFields(variant, index);
        if (variant.id) {
          await tx.productVariant.update({ where: { id: variant.id }, data: fields });
        } else {
          await tx.productVariant.create({ data: { ...fields, productId: id } });
        }
      }

      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productSpec.deleteMany({ where: { productId: id } });
      await tx.product.update({
        where: { id },
        data: {
          ...productFields(data),
          images: { create: data.images.map(imageFields) },
          specs: { create: data.specs.map(specFields) },
        },
      });

      const keptMedia = new Set(data.images.map((image) => image.mediaId));
      for (const { mediaId } of current.images) {
        if (!keptMedia.has(mediaId)) await releaseImage(tx, mediaId);
      }
    },
    { timeout: WRITE_TIMEOUT_MS },
  );

  return getProduct(id);
}

export async function setProductStatus(id: string, { status }: ProductStatusData) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id },
      select: { publishedAt: true, _count: { select: { images: true } } },
    });
    if (!current) throw notFound();

    if (status === "PUBLISHED" && current._count.images === 0) {
      throw new ServiceError("CONFLICT", "Add at least one image before publishing.", 409);
    }

    await tx.product.update({
      where: { id },
      data: {
        status,
        ...(status === "PUBLISHED" && current.publishedAt === null ? { publishedAt: new Date() } : {}),
      },
    });
  });

  return getProduct(id);
}

export async function deleteProduct(id: string) {
  await prisma.$transaction(async (tx) => {
    const current = await tx.product.findUnique({
      where: { id },
      select: { images: { select: { mediaId: true } } },
    });
    if (!current) throw notFound();

    await tx.product.delete({ where: { id } });
    for (const { mediaId } of current.images) await releaseImage(tx, mediaId);
  });

  return { id };
}

/* ---------- mapping ---------- */

function productFields(data: ProductData) {
  return {
    name: data.name,
    slug: data.slug,
    description: data.description,
    brandId: data.brandId,
    categoryId: data.categoryId,
    condition: data.condition,
    grade: data.grade,
    batteryHealth: data.batteryHealth,
    warrantyMonths: data.warrantyMonths,
    highlights: data.highlights,
    included: data.included,
  };
}

function variantFields(variant: VariantData, index: number) {
  return {
    sku: variant.sku,
    storage: variant.storage,
    colour: variant.colour,
    colourHex: variant.colourHex,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: variant.stock,
    sortOrder: index,
  };
}

function imageFields(image: ProductData["images"][number], index: number) {
  return { mediaId: image.mediaId, alt: image.alt, sortOrder: index };
}

function specFields(spec: ProductData["specs"][number], index: number) {
  return { group: spec.group, label: spec.label, value: spec.value, sortOrder: index };
}

/* ---------- rules ---------- */

async function assertSlugFree(tx: Tx, slug: string, exceptId?: string) {
  const owner = await tx.product.findUnique({ where: { slug }, select: { id: true } });
  if (owner && owner.id !== exceptId) {
    const message = "Another product already uses this URL slug.";
    throw new ServiceError("CONFLICT", message, 409, { slug: [message] });
  }
}

async function assertSkusFree(tx: Tx, variants: VariantData[], exceptProductId?: string) {
  const taken = await tx.productVariant.findFirst({
    where: {
      sku: { in: variants.map((variant) => variant.sku), mode: "insensitive" },
      ...(exceptProductId ? { productId: { not: exceptProductId } } : {}),
    },
    select: { sku: true },
  });
  if (taken) {
    const message = `SKU ${taken.sku} is already used by another product.`;
    throw new ServiceError("CONFLICT", message, 409, { variants: [message] });
  }
}

async function assertReferences(tx: Tx, data: ProductData) {
  const brand = await tx.brand.findUnique({ where: { id: data.brandId }, select: { id: true } });
  if (!brand) {
    const message = "That brand no longer exists.";
    throw new ServiceError("VALIDATION", message, 422, { brandId: [message] });
  }

  const category = await tx.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  });
  if (!category) {
    const message = "That category no longer exists.";
    throw new ServiceError("VALIDATION", message, 422, { categoryId: [message] });
  }

  const mediaIds = data.images.map((image) => image.mediaId);
  if (mediaIds.length === 0) return;

  const found = await tx.mediaAsset.count({ where: { id: { in: mediaIds } } });
  if (found !== mediaIds.length) {
    const message = "One of the images no longer exists. Upload it again.";
    throw new ServiceError("VALIDATION", message, 422, { images: [message] });
  }
}
