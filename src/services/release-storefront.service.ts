import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { Paginated } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { releaseStatus } from "@/lib/releases";
import { imageUrl } from "@/lib/storage/image-storage";
import { notCompletedWhere } from "@/services/release.service";
import type {
  StorefrontRelease,
  StorefrontReleaseImage,
  StorefrontReleaseProduct,
  StorefrontReleaseSummary,
  StorefrontReleaseVariant,
} from "@/types/storefront-release";

const SUMMARY_IMAGES_PER_PRODUCT = 1;

export function visibleReleaseWhere(now: Date): Prisma.ReleaseWhereInput {
  return {
    publishedAt: { not: null },
    hidden: false,
    slug: { not: null },
    allocations: { some: { variant: { product: { deletedAt: null } } } },
    AND: [notCompletedWhere(now)],
  };
}

function releaseSelect(imagesPerProduct?: number) {
  return {
    id: true,
    slug: true,
    title: true,
    edition: true,
    description: true,
    startsAt: true,
    endsAt: true,
    publishedAt: true,
    completedAt: true,
    maxPerCustomer: true,
    allocations: {
      where: { variant: { product: { deletedAt: null } } },
      orderBy: [{ variant: { product: { name: "asc" } } }, { variant: { sortOrder: "asc" } }],
      select: {
        available: true,
        variant: {
          select: {
            id: true,
            sku: true,
            storage: true,
            colour: true,
            condition: true,
            grade: true,
            price: true,
            compareAtPrice: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  select: { mediaId: true, alt: true },
                  orderBy: { sortOrder: "asc" },
                  take: imagesPerProduct,
                },
              },
            },
          },
        },
      },
    },
  } satisfies Prisma.ReleaseSelect;
}

type ReleaseRow = Prisma.ReleaseGetPayload<{ select: ReturnType<typeof releaseSelect> }>;

function toImage(image: { mediaId: string; alt: string }, fallbackAlt: string): StorefrontReleaseImage {
  return { url: imageUrl(image.mediaId), alt: image.alt || fallbackAlt };
}

function groupProducts(row: ReleaseRow): StorefrontReleaseProduct[] {
  const products = new Map<string, StorefrontReleaseProduct>();
  for (const { available, variant } of row.allocations) {
    const { product, ...fields } = variant;
    let entry = products.get(product.id);
    if (!entry) {
      entry = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        images: product.images.map((image) => toImage(image, product.name)),
        variants: [],
      };
      products.set(product.id, entry);
    }
    entry.variants.push({ ...fields, available });
  }
  return [...products.values()];
}

function cheapestVariant(products: StorefrontReleaseProduct[]): StorefrontReleaseVariant | null {
  return products
    .flatMap((product) => product.variants)
    .reduce<StorefrontReleaseVariant | null>((low, variant) => (!low || variant.price < low.price ? variant : low), null);
}

function toSummary(row: ReleaseRow, products: StorefrontReleaseProduct[], now: Date): StorefrontReleaseSummary {
  const totalAvailable = row.allocations.reduce((sum, allocation) => sum + allocation.available, 0);
  const cheapest = cheapestVariant(products);
  return {
    id: row.id,
    slug: row.slug ?? "",
    title: row.title,
    edition: row.edition,
    status: releaseStatus(row, totalAvailable, now),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    maxPerCustomer: row.maxPerCustomer,
    totalAvailable,
    productNames: products.map((product) => product.name),
    image: products.find((product) => product.images.length > 0)?.images[0] ?? null,
    fromPrice: cheapest?.price ?? null,
    compareAtPrice: cheapest?.compareAtPrice ?? null,
  };
}

export async function listStorefrontReleases({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<Paginated<StorefrontReleaseSummary>> {
  const now = new Date();
  const where = visibleReleaseWhere(now);
  const [rows, total] = await prisma.$transaction([
    prisma.release.findMany({
      where,
      select: releaseSelect(SUMMARY_IMAGES_PER_PRODUCT),
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.release.count({ where }),
  ]);
  return { items: rows.map((row) => toSummary(row, groupProducts(row), now)), page, pageSize, total };
}

export async function getStorefrontRelease(slug: string): Promise<StorefrontRelease | null> {
  const now = new Date();
  const row = await prisma.release.findFirst({
    where: { AND: [visibleReleaseWhere(now), { slug }] },
    select: releaseSelect(),
  });
  if (!row) return null;
  const products = groupProducts(row);
  return { ...toSummary(row, products, now), description: row.description, products };
}
