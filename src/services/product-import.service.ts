import "server-only";

import type { z } from "zod";
import { ServiceError } from "@/lib/api/api-response";
import {
  PRODUCT_IMPORT_IMAGE_CHECK_CONCURRENCY,
  PRODUCT_IMPORT_IMAGE_CHECK_TIMEOUT_MS,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { MAX_IMAGE_BYTES, formatBytes, isImageMimeType } from "@/lib/media";
import {
  IMPORT_COLUMN_KEYS,
  IMPORT_LIST_SEPARATOR,
  importColumnHeader,
  missingColumns,
  type ImportRow,
} from "@/lib/product-import";
import {
  analyseImport,
  imageAddressProblem,
  type ExistingVariant,
  type ImportLookups,
} from "@/lib/product-import-analyse";
import { isPublicHost } from "@/lib/public-address";
import type { productImportValidateSchema } from "@/validators/product-import.validator";

type ValidateInput = z.output<typeof productImportValidateSchema>;

const keyOf = (value: string) => value.trim().toLowerCase();
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

/**
 * Checks an import without writing anything: looks up what the rows refer to
 * in a few batched queries, then hands the rows and the findings to
 * `analyseImport`. See docs/BULK-UPLOAD.md.
 */
export async function validateImport({ mode, columns, rows: cells }: ValidateInput) {
  const absent = missingColumns(
    columns.filter((column): column is (typeof IMPORT_COLUMN_KEYS)[number] =>
      (IMPORT_COLUMN_KEYS as string[]).includes(column),
    ),
    mode,
  );
  if (absent.length > 0) {
    const names = absent.map(importColumnHeader).join(", ");
    throw new ServiceError("VALIDATION", `The file is missing the column ${names}.`, 422);
  }

  const rows = cells as ImportRow[];
  const lookups = await loadLookups(rows);
  return analyseImport(rows, mode, lookups);
}

async function loadLookups(rows: ImportRow[]): Promise<ImportLookups> {
  const slugs = unique(rows.map((row) => keyOf(row.productSlug)));
  const skus = unique(rows.map((row) => row.sku));
  const brandKeys = unique(rows.map((row) => keyOf(row.brand)));
  const categorySlugs = unique(rows.map((row) => keyOf(row.category)));
  const imageUrls = unique(rows.flatMap((row) => row.images.split(IMPORT_LIST_SEPARATOR).map((url) => url.trim())));

  const [brands, categories, products, variants, imageProblems] = await Promise.all([
    prisma.brand.findMany({ where: { nameKey: { in: brandKeys } }, select: { id: true, nameKey: true } }),
    prisma.category.findMany({
      where: { slug: { in: categorySlugs } },
      select: { id: true, slug: true, status: true },
    }),
    // Trash is included on purpose: a product there still holds its slug.
    prisma.product.findMany({
      where: { slug: { in: slugs, mode: "insensitive" } },
      select: { slug: true, deletedAt: true },
    }),
    prisma.productVariant.findMany({
      where: { sku: { in: skus, mode: "insensitive" } },
      select: {
        sku: true,
        storage: true,
        colour: true,
        colourHex: true,
        condition: true,
        grade: true,
        batteryHealth: true,
        price: true,
        compareAtPrice: true,
        stock: true,
        lowStockThreshold: true,
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            brandId: true,
            categoryId: true,
            status: true,
            warrantyMonths: true,
            deletedAt: true,
            _count: { select: { images: true } },
          },
        },
      },
    }),
    checkImageUrls(imageUrls),
  ]);

  return {
    brands: new Map(brands.map((brand) => [brand.nameKey, brand.id])),
    categories: new Map(
      categories.map((category) => [category.slug, { id: category.id, archived: category.status === "ARCHIVED" }]),
    ),
    productsBySlug: new Map(products.map((product) => [keyOf(product.slug), { inTrash: product.deletedAt !== null }])),
    variantsBySku: new Map(
      variants.map(({ product, ...variant }): [string, ExistingVariant] => [
        keyOf(variant.sku),
        {
          ...variant,
          product: {
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            brandId: product.brandId,
            categoryId: product.categoryId,
            status: product.status,
            warrantyMonths: product.warrantyMonths,
            inTrash: product.deletedAt !== null,
            imageCount: product._count.images,
          },
        },
      ]),
    ),
    imageProblems,
  };
}

/* ---------- image addresses ---------- */

/** Asks each distinct address, a few at a time, whether it answers with a usable image. */
async function checkImageUrls(urls: string[]): Promise<Map<string, string>> {
  const problems = new Map<string, string>();
  const queue = urls.filter((url) => imageAddressProblem(url) === null);

  async function worker() {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      const problem = await imageProblem(url);
      if (problem) problems.set(url, problem);
    }
  }
  await Promise.all(Array.from({ length: PRODUCT_IMPORT_IMAGE_CHECK_CONCURRENCY }, worker));
  return problems;
}

async function imageProblem(url: string): Promise<string | null> {
  if (!(await isPublicHost(new URL(url).hostname))) return "That address isn't a public website.";
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(PRODUCT_IMPORT_IMAGE_CHECK_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) return "The address redirects. Use the final image address.";
    if (!response.ok) return `The image couldn't be reached (HTTP ${response.status}).`;

    const type = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
    if (!isImageMimeType(type)) return "That address isn't a PNG, JPEG, WebP or AVIF image.";
    const size = Number(response.headers.get("content-length"));
    if (size > MAX_IMAGE_BYTES) return `The image is ${formatBytes(size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`;
    return null;
  } catch {
    return "The image couldn't be reached.";
  }
}
