import "server-only";

import type { z } from "zod";
import type { Prisma, ProductImport } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  DB_WRITE_TIMEOUT_MS,
  PRODUCT_IMPORT_BATCH_SIZE,
  PRODUCT_IMPORT_CLAIM_TIMEOUT_MS,
  PRODUCT_IMPORT_IMAGE_FETCH_TIMEOUT_MS,
  PRODUCT_IMPORT_MAX_ROWS,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { MAX_IMAGE_BYTES, formatBytes } from "@/lib/media";
import { isImportUnfinished, withImportRowDefaults, type ImportMode, type ImportRow } from "@/lib/product-import";
import {
  analyseImport,
  describeImportError,
  storedRowOutcome,
  type ImportPlan,
  type UpdatePlan,
} from "@/lib/product-import-analyse";
import { isPublicHost } from "@/lib/public-address";
import { imageStorage } from "@/lib/storage/image-storage";
import type { SessionUser } from "@/types/auth";
import type { ProductImportItem, ProductImportRowItem } from "@/types/product-import";
import type {
  productImportCreateSchema,
  productImportListQuerySchema,
  productImportRowsQuerySchema,
} from "@/validators/product-import.validator";
import { recordAudit } from "./audit.service";
import { refreshStorefrontCatalogue } from "./catalogue.service";
import { releaseImage } from "./media.service";
import { createProduct } from "./product.service";
import { assertImportAccess, imageResponseProblem, loadLookups, validateImport } from "./product-import.service";

/**
 * Saving an import and running it. An import is stored with its rows, then
 * saved a few products at a time by repeated calls to `processImport`, so a
 * large file never ties up the server and a refresh or a repeated call can't
 * save anything twice. See docs/BULK-UPLOAD.md.
 */

type CreateInput = z.output<typeof productImportCreateSchema>;
type ListQuery = z.output<typeof productImportListQuerySchema>;
type RowsQuery = z.output<typeof productImportRowsQuerySchema>;

interface StoredRow {
  id: string;
  row: ImportRow;
}

/** Set on a row's `productId` while a request is saving it, so a second request skips it. */
const CLAIMED = "claimed";

const keyOf = (value: string) => value.trim().toLowerCase();
const notFound = () => new ServiceError("NOT_FOUND", "That import no longer exists.", 404);

function toItem(record: ProductImport): ProductImportItem {
  return {
    id: record.id,
    fileName: record.fileName,
    mode: record.mode,
    status: record.status,
    totalRows: record.totalRows,
    importedRows: record.importedRows,
    failedRows: record.failedRows,
    skippedRows: record.skippedRows,
    uploadedByName: record.uploadedByName,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
  };
}

/* ---------- reading ---------- */

export async function listImports({ page, pageSize, status }: ListQuery) {
  const where: Prisma.ProductImportWhereInput = status ? { status } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.productImport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productImport.count({ where }),
  ]);
  return { items: rows.map(toItem), page, pageSize, total };
}

export async function getImport(id: string) {
  const record = await prisma.productImport.findUnique({ where: { id } });
  if (!record) throw notFound();
  return toItem(record);
}

function toRowItem(row: {
  id: string;
  rowNumber: number;
  productName: string;
  sku: string;
  status: ProductImportRowItem["status"];
  error: string | null;
}): ProductImportRowItem {
  return {
    id: row.id,
    rowNumber: row.rowNumber,
    productName: row.productName,
    sku: row.sku,
    status: row.status,
    error: row.error,
  };
}

const rowSelect = { id: true, rowNumber: true, productName: true, sku: true, status: true, error: true } as const;

export async function listImportRows(importId: string, { page, pageSize, status }: RowsQuery) {
  await getImport(importId);
  const where: Prisma.ProductImportRowWhereInput = { importId, ...(status ? { status } : {}) };
  const [rows, total] = await prisma.$transaction([
    prisma.productImportRow.findMany({
      where,
      orderBy: { rowNumber: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: rowSelect,
    }),
    prisma.productImportRow.count({ where }),
  ]);
  return { items: rows.map(toRowItem), page, pageSize, total };
}

/** Every failed row for the error report. An import holds at most `PRODUCT_IMPORT_MAX_ROWS`, so this is bounded. */
export async function listFailedRows(importId: string) {
  await getImport(importId);
  const rows = await prisma.productImportRow.findMany({
    where: { importId, status: "FAILED" },
    orderBy: { rowNumber: "asc" },
    take: PRODUCT_IMPORT_MAX_ROWS,
    select: rowSelect,
  });
  return rows.map(toRowItem);
}

/* ---------- saving an import ---------- */

/** Checks the rows again and stores the import, with invalid rows already Failed and duplicates already Skipped. */
export async function createImport(user: SessionUser, { fileName, ...input }: CreateInput) {
  const preview = await validateImport(input);
  if (input.mode === "UPDATE_EXISTING" && preview.invalidRows > 0) {
    throw new ServiceError("VALIDATION", "Some rows still need fixing. An update only runs when every row is valid.", 422);
  }
  if (preview.validRows === 0) {
    throw new ServiceError("VALIDATION", "Nothing in this file can be imported. Every row needs fixing or is already in the catalogue.", 422);
  }

  const rows = input.rows as ImportRow[];
  const record = await prisma.$transaction(
    async (tx) => {
      const created = await tx.productImport.create({
        data: {
          fileName,
          mode: input.mode,
          totalRows: rows.length,
          failedRows: preview.invalidRows,
          skippedRows: preview.skippedRows,
          uploadedById: user.id,
          uploadedByName: user.fullName,
        },
      });
      await tx.productImportRow.createMany({
        data: rows.map((row, index) => {
          const previewRow = preview.rows[index];
          return {
            importId: created.id,
            rowNumber: row.rowNumber,
            productName: previewRow?.productName || row.productSlug || row.sku,
            sku: row.sku,
            data: row as unknown as Prisma.InputJsonValue,
            ...(previewRow ? storedRowOutcome(previewRow) : {}),
          };
        }),
      });
      return created;
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );
  return toItem(record);
}

/* ---------- running an import ---------- */

/**
 * Saves the next batch of products and answers with where the import stands.
 * The caller repeats it until the status is no longer Pending or Processing.
 * Safe to repeat or run twice at once: a row is claimed before it is saved,
 * and a finished import answers with its result unchanged.
 */
export async function processImport(id: string, user: SessionUser) {
  const record = await prisma.productImport.findUnique({ where: { id } });
  if (!record) throw notFound();
  if (!isImportUnfinished(record.status)) return toItem(record);
  assertImportAccess(user.permissions, record.mode);

  // Rows claimed by a request that died would otherwise stay unsaved for ever.
  if (Date.now() - record.updatedAt.getTime() > PRODUCT_IMPORT_CLAIM_TIMEOUT_MS) {
    await prisma.productImportRow.updateMany({ where: { importId: id, productId: CLAIMED }, data: { productId: null } });
  }

  await prisma.productImport.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  const pending = await prisma.productImportRow.findMany({
    where: { importId: id, status: "PENDING", productId: null },
    orderBy: { rowNumber: "asc" },
    select: { id: true, data: true },
  });
  const groups = groupRows(
    record.mode,
    pending.map(({ id: rowId, data }): StoredRow => ({ id: rowId, row: withImportRowDefaults(data as unknown as ImportRow) })),
  ).slice(0, PRODUCT_IMPORT_BATCH_SIZE);

  if (groups.length > 0) {
    const lookups = await loadLookups(
      groups.flatMap((group) => group.map(({ row }) => row)),
      false,
    );
    const images = new Map<string, string>();
    for (const group of groups) {
      // A live request keeps the import fresh, so its claims are never mistaken for a dead one's.
      await prisma.productImport.updateMany({ where: { id }, data: { updatedAt: new Date() } });
      await processGroup(user, record.mode, group, lookups, images);
    }
  }

  return settleImport(record, user);
}

/** Create New saves a product's rows together; Update Existing saves one row at a time. */
function groupRows(mode: ImportMode, rows: StoredRow[]): StoredRow[][] {
  const groups = new Map<string, StoredRow[]>();
  for (const stored of rows) {
    const key = mode === "CREATE_NEW" ? keyOf(stored.row.productSlug) : stored.id;
    groups.set(key, [...(groups.get(key) ?? []), stored]);
  }
  return [...groups.values()];
}

type Lookups = Awaited<ReturnType<typeof loadLookups>>;

async function processGroup(
  user: SessionUser,
  mode: ImportMode,
  group: StoredRow[],
  lookups: Lookups,
  images: Map<string, string>,
) {
  const ids = group.map(({ id }) => id);
  const claimed = await prisma.productImportRow.updateMany({
    where: { id: { in: ids }, status: "PENDING", productId: null },
    data: { productId: CLAIMED },
  });
  if (claimed.count !== ids.length) {
    // Another request has some of these rows. Hand back any this one took.
    await prisma.productImportRow.updateMany({ where: { id: { in: ids }, productId: CLAIMED }, data: { productId: null } });
    return;
  }

  try {
    // Rows were checked at upload, but a slug or SKU can be taken since, so check again against what is stored now.
    const plan: ImportPlan = { creates: new Map(), updates: new Map() };
    const preview = analyseImport(
      group.map(({ row }) => row),
      mode,
      lookups,
      plan,
    );
    if (preview.invalidRows > 0) {
      await failRows(group, preview.rows.map((row) => row.errors.map(describeImportError).join(" ")));
      return;
    }
    if (preview.skippedRows === group.length) {
      await prisma.productImportRow.updateMany({ where: { id: { in: ids } }, data: { status: "SKIPPED", productId: null } });
      return;
    }

    const saved = mode === "CREATE_NEW" ? await saveNewProduct(plan, images) : await saveUpdate(plan, images);
    await prisma.productImportRow.updateMany({
      where: { id: { in: ids } },
      data: { status: "IMPORTED", error: null, productId: saved.productId },
    });
    await recordAudit(user, {
      action: mode === "CREATE_NEW" ? "CREATE" : "UPDATE",
      module: PERMISSIONS.products,
      recordId: saved.productId,
      recordLabel: saved.label,
      after: { ...saved.after, source: "Bulk Product Upload" },
    });
  } catch (error) {
    if (!(error instanceof ServiceError)) console.error("product import row failed", error);
    const message = error instanceof ServiceError ? error.message : "This product couldn't be saved.";
    await failRows(group, group.map(() => message));
  }
}

/** A row with no message of its own failed because another row of the same product did. */
async function failRows(group: StoredRow[], messages: string[]) {
  const shared = messages.find(Boolean) ?? "This product couldn't be saved.";
  await Promise.all(
    group.map(({ id }, index) =>
      prisma.productImportRow.update({
        where: { id },
        data: {
          status: "FAILED",
          productId: null,
          error: messages[index] || (group.length > 1 ? `Not imported: another row of this product has an error. ${shared}` : shared),
        },
      }),
    ),
  );
}

interface SavedProduct {
  productId: string;
  label: string;
  after: object;
}

async function saveNewProduct(plan: ImportPlan, cache: Map<string, string>): Promise<SavedProduct> {
  const [entry] = [...plan.creates.values()];
  if (!entry) throw new ServiceError("VALIDATION", "This product couldn't be read.", 422);

  const mediaIds = await downloadImages(entry.data.images.map((image) => image.mediaId), cache);
  const created = await createProduct(
    { ...entry.data, images: entry.data.images.map((image) => ({ ...image, mediaId: mediaIds.get(image.mediaId) ?? "" })) },
    entry.status ?? undefined,
  );
  return { productId: created.id, label: created.name, after: created };
}

async function saveUpdate(plan: ImportPlan, cache: Map<string, string>): Promise<SavedProduct> {
  const [update] = [...plan.updates.values()];
  if (!update) throw new ServiceError("VALIDATION", "This row couldn't be read.", 422);
  const downloaded = await downloadImages(update.images, cache);
  const productId = await updateFromImport(update, update.images.map((url) => downloaded.get(url) ?? ""));
  return { productId, label: `SKU ${update.sku}`, after: { sku: update.sku, ...update.variant, ...update.product } };
}

/**
 * Changes one variant and, when this row carries them, its product's fields,
 * images and specifications, in one transaction. Nothing is deleted except the
 * images and specs a filled cell replaces.
 */
async function updateFromImport(update: UpdatePlan, mediaIds: string[]): Promise<string> {
  return prisma.$transaction(
    async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: { sku: { equals: update.sku, mode: "insensitive" }, product: { deletedAt: null } },
        select: { id: true, productId: true },
      });
      if (!variant) throw new ServiceError("NOT_FOUND", "This SKU no longer exists.", 404);
      const { productId } = variant;

      await tx.productVariant.update({ where: { id: variant.id }, data: update.variant });

      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { publishedAt: true, images: { select: { mediaId: true } } },
      });

      if (mediaIds.length > 0) {
        await tx.productImage.deleteMany({ where: { productId } });
        await tx.productImage.createMany({
          data: mediaIds.map((mediaId, sortOrder) => ({ productId, mediaId, sortOrder })),
        });
        for (const { mediaId } of product.images) {
          if (!mediaIds.includes(mediaId)) await releaseImage(tx, mediaId);
        }
      }
      if (update.specs.length > 0) {
        await tx.productSpec.deleteMany({ where: { productId } });
        await tx.productSpec.createMany({
          data: update.specs.map((spec, sortOrder) => ({ productId, ...spec, sortOrder })),
        });
      }

      const patch = update.product ?? {};
      const imageCount = mediaIds.length > 0 ? mediaIds.length : product.images.length;
      if (patch.status === "PUBLISHED" && imageCount === 0) {
        throw new ServiceError("CONFLICT", "Add at least one image before publishing.", 409);
      }

      const lowest = await tx.productVariant.aggregate({ where: { productId }, _min: { price: true } });
      await tx.product.update({
        where: { id: productId },
        data: {
          ...patch,
          ...(patch.status === "PUBLISHED" && product.publishedAt === null ? { publishedAt: new Date() } : {}),
          minPrice: lowest._min.price ?? 0,
        },
      });
      return productId;
    },
    { timeout: DB_WRITE_TIMEOUT_MS },
  );
}

/* ---------- images ---------- */

/** Downloads each distinct address once and stores it. The cache lasts a batch, so a repeated address is fetched once. */
async function downloadImages(urls: string[], cache: Map<string, string>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const url of new Set(urls)) {
    const known = cache.get(url) ?? (await downloadImage(url));
    cache.set(url, known);
    ids.set(url, known);
  }
  return ids;
}

async function downloadImage(url: string): Promise<string> {
  const fail = (reason: string) => new ServiceError("VALIDATION", `${url}: ${reason}`, 422);

  if (!(await isPublicHost(new URL(url).hostname))) throw fail("That address isn't a public website.");

  let response: Response;
  try {
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(PRODUCT_IMPORT_IMAGE_FETCH_TIMEOUT_MS) });
  } catch {
    throw fail("The image couldn't be reached.");
  }
  const problem = imageResponseProblem(response);
  if (problem) throw fail(problem);

  const data = new Uint8Array(await response.arrayBuffer());
  if (data.byteLength > MAX_IMAGE_BYTES) {
    throw fail(`The image is ${formatBytes(data.byteLength)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`);
  }
  const mimeType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
  const { id } = await imageStorage.put({ data, mimeType });
  return id;
}

/* ---------- finishing ---------- */

/** Recounts the rows, and closes the import once none are left to save. */
async function settleImport(record: ProductImport, user: SessionUser) {
  const counts = await prisma.productImportRow.groupBy({
    by: ["status"],
    where: { importId: record.id },
    _count: { _all: true },
  });
  const count = (status: string) => counts.find((entry) => entry.status === status)?._count._all ?? 0;
  const [importedRows, failedRows, skippedRows, pendingRows] = [
    count("IMPORTED"),
    count("FAILED"),
    count("SKIPPED"),
    count("PENDING"),
  ];

  if (pendingRows > 0) {
    return toItem(await prisma.productImport.update({ where: { id: record.id }, data: { importedRows, failedRows, skippedRows } }));
  }

  const status = failedRows === 0 ? "COMPLETED" : importedRows === 0 ? "FAILED" : "COMPLETED_WITH_ERRORS";
  // Only the request that closes the import records it, so a repeated call doesn't log it twice.
  const closed = await prisma.productImport.updateMany({
    where: { id: record.id, status: "PROCESSING" },
    data: { importedRows, failedRows, skippedRows, status, completedAt: new Date() },
  });
  const final = await prisma.productImport.findUniqueOrThrow({ where: { id: record.id } });

  if (closed.count === 1) {
    await recordAudit(user, {
      action: "CREATE",
      module: PERMISSIONS.bulkUpload,
      recordId: record.id,
      recordLabel: record.fileName,
      after: { mode: record.mode, status, totalRows: record.totalRows, importedRows, failedRows, skippedRows },
    });
    refreshStorefrontCatalogue();
  }
  return toItem(final);
}
