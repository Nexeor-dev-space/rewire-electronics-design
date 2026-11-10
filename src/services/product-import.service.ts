import "server-only";

import type { z } from "zod";
import { ServiceError } from "@/lib/api/api-response";
import { hasPermission, PERMISSIONS, type PermissionGrid } from "@/lib/auth/permissions";
import {
  PRODUCT_IMPORT_IMAGE_CHECK_CONCURRENCY,
  PRODUCT_IMPORT_IMAGE_CHECK_TIMEOUT_MS,
  PRODUCT_IMPORT_MAX_IMAGES,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { MAX_IMAGE_BYTES, formatBytes, isImageMimeType } from "@/lib/media";
import {
  IMPORT_COLUMN_KEYS,
  IMPORT_MODE_LABELS,
  distinctImageUrls,
  importColumnHeader,
  missingColumns,
  type ImportMode,
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
/**
 * An import changes products, so the Bulk Product Upload permission alone is
 * not enough: the caller also needs the Products permission the same change
 * would need in the product form. Create New needs Create, Update Existing
 * needs Edit, and setting a status other than a new draft needs Publish.
 * With no rows only the mode is checked.
 */
export function assertImportAccess(permissions: PermissionGrid, mode: ImportMode, rows: ImportRow[] = []) {
  const action = mode === "CREATE_NEW" ? "CREATE" : "EDIT";
  if (!hasPermission(permissions, PERMISSIONS.products, action)) {
    throw new ServiceError(
      "FORBIDDEN",
      `${IMPORT_MODE_LABELS[mode]} also needs ${action === "CREATE" ? "Create" : "Edit"} access to Products.`,
      403,
    );
  }

  const setsStatus = rows.some((row) => {
    const status = row.productStatus.trim().toUpperCase();
    return status !== "" && !(mode === "CREATE_NEW" && status === "DRAFT");
  });
  if (setsStatus && !hasPermission(permissions, PERMISSIONS.products, "PUBLISH")) {
    throw new ServiceError("FORBIDDEN", "Setting a product status in an import also needs Publish access to Products.", 403);
  }
}

export async function validateImport({ mode, columns, rows: cells }: ValidateInput, checkImages = true) {
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
  const images = distinctImageUrls(rows).length;
  if (images > PRODUCT_IMPORT_MAX_IMAGES) {
    throw new ServiceError(
      "VALIDATION",
      `That file lists ${images} different image addresses. The limit is ${PRODUCT_IMPORT_MAX_IMAGES} per file.`,
      422,
    );
  }
  const lookups = await loadLookups(rows, checkImages);
  return analyseImport(rows, mode, lookups);
}

export async function loadLookups(rows: ImportRow[], checkImages: boolean): Promise<ImportLookups> {
  const slugs = unique(rows.map((row) => keyOf(row.productSlug)));
  const skus = unique(rows.map((row) => row.sku));
  const brandKeys = unique(rows.map((row) => keyOf(row.brand)));
  const categoryKeys = unique(rows.map((row) => keyOf(row.category)));
  const gtins = unique(rows.map((row) => row.gtin));
  const imageUrls = distinctImageUrls(rows);

  const [brands, categories, products, gtinOwners, variants, imageProblems] = await Promise.all([
    prisma.brand.findMany({ where: { nameKey: { in: brandKeys } }, select: { id: true, nameKey: true } }),
    prisma.category.findMany({
      where: { OR: [{ slug: { in: categoryKeys } }, { nameKey: { in: categoryKeys } }] },
      select: { id: true, slug: true, nameKey: true, status: true },
    }),
    // Trash is included on purpose: a product there still holds its slug.
    prisma.product.findMany({
      where: { slug: { in: slugs, mode: "insensitive" } },
      select: { slug: true, deletedAt: true },
    }),
    prisma.product.findMany({ where: { gtin: { in: gtins } }, select: { gtin: true, deletedAt: true } }),
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
    checkImages ? checkImageUrls(imageUrls) : new Map<string, string>(),
  ]);

  return {
    brands: new Map(brands.map((brand) => [brand.nameKey, brand.id])),
    categories: new Map(
      [...categories.map((category) => [category.nameKey, category] as const), ...categories.map((category) => [category.slug, category] as const)].map(
        ([key, category]) => [key, { id: category.id, archived: category.status === "ARCHIVED" }] as const,
      ),
    ),
    productsBySlug: new Map(products.map((product) => [keyOf(product.slug), { inTrash: product.deletedAt !== null }])),
    productsByGtin: new Map(gtinOwners.map((owner) => [owner.gtin ?? "", { inTrash: owner.deletedAt !== null }])),
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
    return imageResponseProblem(response);
  } catch {
    return "The image couldn't be reached.";
  }
}

/** Whether an answer from an image address can be used: no redirect, a real image, within the size limit. */
export function imageResponseProblem(response: Response): string | null {
  if (response.status >= 300 && response.status < 400) return "The address redirects. Use the final image address.";
  if (!response.ok) return `The image couldn't be reached (HTTP ${response.status}).`;

  const type = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  if (!isImageMimeType(type)) return "That address isn't a PNG, JPEG, WebP or AVIF image.";
  const size = Number(response.headers.get("content-length"));
  if (size > MAX_IMAGE_BYTES) return `The image is ${formatBytes(size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`;
  return null;
}
