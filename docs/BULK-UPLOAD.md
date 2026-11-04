# Bulk Product Upload

Create or update products and their variants from a CSV file, with every row checked before anything is saved. Issue #110. The full plan is in [superpowers/plans/2026-11-04-bulk-product-upload.md](superpowers/plans/2026-11-04-bulk-product-upload.md).

Read this before you change the import columns, the validation rules or the Bulk Product Upload screen. [CATALOGUE.md](CATALOGUE.md) covers the product model the import writes to.

---

## 1. Status

| Part | State |
| --- | --- |
| Part 1: template, upload, validation, preview | Built. No database change |
| Part 2: saving the import, progress, history, error report | Built. Migration `add_product_import` |

The preview saves nothing. Nothing reaches the catalogue until Import is clicked.

---

## 2. The CSV

One row is one variant. Rows that share a `product_slug` form one product. Product level cells are read from the first row of the product; later rows may repeat them or leave them blank, but a different value is an error.

| Column | Create New | Maps to |
| --- | --- | --- |
| `product_name` | Required | `Product.name` |
| `product_slug` | Required | `Product.slug` |
| `description` | Optional | `Product.description` |
| `brand` | Required | Brand name, matched on `Brand.nameKey` |
| `category` | Required | Category slug |
| `product_status` | Optional, default DRAFT | `Product.status` |
| `warranty_months` | Optional, default 12 | `Product.warrantyMonths` |
| `images` | Optional | https addresses separated by `\|` |
| `specifications` | Optional | `Group::Label::Value` entries separated by `\|` |
| `sku` | Required | `ProductVariant.sku`, the match key for updates |
| `variant_name` | Optional | Shown in the file for readability. Not stored, the schema has no such field |
| `condition` | Required | NEW, OPEN_BOX, PRE_OWNED or REFURBISHED |
| `grade` | Optional | PREMIUM, EXCELLENT, VERY_GOOD or GOOD. Only for PRE_OWNED and REFURBISHED |
| `storage`, `colour` | Optional | `ProductVariant.storage`, `ProductVariant.colour` |
| `price` | Required | Decimal AED, stored as fils |
| `compare_at_price` | Optional | Decimal AED, must be above the price |
| `stock` | Required | `ProductVariant.stock` |

The columns live in `IMPORT_COLUMNS` in `src/lib/product-import.ts`. The template is built from that list, so the template and the validation can't drift apart. It has a header row, a Required or Optional row, and sample products. The reader skips the Required or Optional row, so a filled in template uploads unchanged. Enum cells ignore case.

Limits are constants in `src/lib/constants.ts`: `PRODUCT_IMPORT_MAX_BYTES` (2 MB), `PRODUCT_IMPORT_MAX_ROWS` (500) and `PRODUCT_IMPORT_MAX_CELL_LENGTH`.

---

## 3. Modes

**Create New.** Adds products. A slug or SKU that already exists is an error, products in Trash included. Brand and category must already exist and are never created. A category that is archived is refused.

**Update Existing.** Matches variants by SKU. Only `sku` is required.

1. A blank cell keeps the stored value. A filled cell replaces it.
2. A SKU that doesn't exist is an error. This mode never creates.
3. `product_slug` may be given as a check, but it must match the SKU's product. An import never changes a slug.
4. The stored variant with the filled cells laid over it must pass the same variant rules as the product form.
5. Images and specifications are replaced as a whole when their cell is filled.
6. Nothing is deleted. Variants missing from the file are left alone.
7. A value can be replaced but not cleared, because blank means keep.

The preview lists what will change for each row, for example `price: 2000.00 → 1800.00`.

---

## 4. Validation

Everything below happens before any write. In Part 1 nothing is written at all.

1. The browser checks the file name, size, encoding, header and row count, and reads the CSV (`parseImportFile`). An unknown column, a repeated column or a missing required column stops the upload with one message.
2. `POST /api/v1/admin/product-imports/validate` receives the parsed rows and checks them again. The server never trusts the browser's checks.
3. `analyseImport` in `src/lib/product-import-analyse.ts` validates each row, groups rows into products, and runs each Create New product through `productSchema`, so the form's rules are the import's rules. Zod issue paths are mapped back to a row and a column.
4. `validateImport` in `src/services/product-import.service.ts` looks up brands, categories, slugs and SKUs in four batched queries, never one query per row.
5. Every distinct image address is checked once: https only, the host must resolve to a public address (`src/lib/public-address.ts`, which refuses loopback, private and link local ranges), and a HEAD request must answer with a PNG, JPEG, WebP or AVIF under 2 MB. A redirect is refused. At most `PRODUCT_IMPORT_IMAGE_CHECK_CONCURRENCY` addresses are checked at once, each with a `PRODUCT_IMPORT_IMAGE_CHECK_TIMEOUT_MS` timeout.
6. A product set to PUBLISHED needs at least one image, the same rule as publishing from the product form.

A file can only be imported when every row is valid.

---

## 5. Saving and running an import

1. **Import.** The screen sends the same rows again to `POST /api/v1/admin/product-imports`. The server runs the whole validation a second time and, only if every row is valid, stores one `product_imports` row (Pending) and one `product_import_rows` row per CSV row. Image addresses are not requested again here, since the preview has just checked them. Nothing is in the catalogue yet. From here the import survives a refresh.
2. **Batches.** The screen then calls `POST /api/v1/admin/product-imports/[id]/process` again and again. Each call saves up to `PRODUCT_IMPORT_BATCH_SIZE` (20) products and answers with the import's counts, which drive the progress bar. There is no background worker and no polling job.
3. **One product at a time.** Create New saves all rows of a product together through `createProduct`, in one transaction, so a product is saved whole or not at all. Update Existing saves one row at a time in one transaction. A product that fails is marked Failed with the reason, and the batch carries on.
4. **Checked again at write time.** A slug or SKU can be taken between upload and import, so each product is validated again against what is stored now. A clash becomes a Failed row.
5. **No double processing.** A row is claimed (its `productId` is set to `claimed`) before it is saved, and only Pending unclaimed rows are picked. A repeated or parallel call finds nothing to do, and a finished import answers with its result unchanged.
6. **Images.** Each distinct address is downloaded once at import time with the same checks as the preview (public host, no redirect, image type, 2 MB) and stored as a `MediaAsset`. A product whose image fails is a failed product. An address used by several rows of a batch is downloaded once. The host is checked just before the download, but the download resolves it again, so the address is not pinned between the two.
7. **Finish.** When no Pending row is left the status becomes Completed (no failures), Completed with Errors (some) or Failed (none imported). The one request that closes the import writes one Change Log entry under Bulk Product Upload and refreshes the storefront catalogue. Each product saved also gets its own Change Log entry under Products (Created or Updated), marked `source: Bulk Product Upload`, so a changed price can be traced to the product.
8. **Resume.** If the tab closes midway the import stays Pending or Processing. Import history shows a Resume button that carries on with the rows that are left.
9. **Error report.** The failed rows, with row number, SKU, product and reason, downloaded as a CSV from the screen or from Import history.

If the server stops in the middle of saving a product, that product's rows stay claimed. A claim older than `PRODUCT_IMPORT_CLAIM_TIMEOUT_MS` (5 minutes, counted from the last batch) is released by the next call, and the rows are saved then. A request that is still running refreshes the import's `updatedAt` before each product, so its claims are not released.

The screen and the Resume button stop asking after `PRODUCT_IMPORT_MAX_STALLED_CALLS` (3) batches in a row that save nothing, and say so. `runImportToEnd` in `src/lib/product-import.ts` does this for both.

Create New can also set `product_status`. `createProduct` takes an optional status for this, so a published product is created in one step with its `publishedAt`.

## 6. Files

| File | Purpose |
| --- | --- |
| `src/lib/product-import.ts` | Columns, template, modes, CSV reader. Client safe |
| `src/lib/product-import-analyse.ts` | Pure row checking and preview building |
| `src/lib/public-address.ts` | Whether the server may fetch from a host |
| `src/types/product-import.ts` | `ImportPreview`, `ImportPreviewRow` |
| `src/validators/product-import.validator.ts` | Request schema |
| `src/services/product-import.service.ts` | `validateImport`, `loadLookups`, image address checks |
| `src/services/product-import-run.service.ts` | `createImport`, `processImport`, `listImports`, `getImport`, `listImportRows`, `listFailedRows` |
| `prisma/schema/product-import.prisma` | `ProductImport`, `ProductImportRow` |
| `src/app/api/v1/admin/product-imports/` | The routes in section 7 |
| `src/hooks/use-product-import.ts` | Queries and mutations for validate, create, process, history and the error report |
| `src/components/admin/product-import/` | Upload screen, drop zone, preview table, history and detail |
| `src/app/admin/products/upload-products/page.tsx`, `upload-history/page.tsx` | The pages |

## 7. API

| Endpoint | Methods | Permission |
| --- | --- | --- |
| `/api/v1/admin/product-imports` | `GET` history (paginated, optional `status`), `POST` store a checked file | View, Create |
| `/api/v1/admin/product-imports/validate` | `POST` check rows, save nothing | Create |
| `/api/v1/admin/product-imports/[id]` | `GET` one import | View |
| `/api/v1/admin/product-imports/[id]/rows` | `GET` its rows (paginated, optional `status`) | View |
| `/api/v1/admin/product-imports/[id]/process` | `POST` save the next batch | Create |
| `/api/v1/admin/product-imports/[id]/errors` | `GET` the failed rows, at most `PRODUCT_IMPORT_MAX_ROWS` | View |

`POST /api/v1/admin/product-imports/validate`

Request body: `{ mode: "CREATE_NEW" | "UPDATE_EXISTING", columns: string[], rows: ImportRow[] }`. Up to 500 rows. Requires `catalogue.bulk-upload` with Create.

Response: an `ImportPreview` with `totalRows`, `productCount`, `validRows`, `invalidRows` and one `ImportPreviewRow` per CSV row, each with its `action`, `changes` and `errors` (a column and a message). A 422 carries a file level message when a required column is missing.

## 8. Permission

Module `catalogue.bulk-upload` with View and Create, in `PERMISSIONS.bulkUpload`. Admin has both. A Staff role gets View at the View level and Create at the Edit level. Without Create the page shows but the upload is hidden, and the route answers 403.

An import changes products, so the module permission is not enough. `assertImportAccess` in `src/services/product-import.service.ts` also requires the Products permission the same change needs in the product form, and answers 403 with the reason when it is missing:

| The import | Also needs on Products |
| --- | --- |
| Create New | Create |
| Update Existing | Edit |
| Any row setting `product_status`, except DRAFT in Create New | Publish |

The check runs on validate, on saving the import, and when a batch is processed (the mode only).

## 9. Configuration, database and breaking changes

1. No environment variable.
2. Database: migration `add_product_import` adds `product_imports` and `product_import_rows` and three enums. It changes no existing table. Rows keep the cells as JSON, so there is no cleanup job yet; deleting an import deletes its rows.
3. No breaking change. `createProduct` gained an optional second argument.
4. Constants in `src/lib/constants.ts`: `PRODUCT_IMPORT_MAX_BYTES` (2 MB), `PRODUCT_IMPORT_MAX_ROWS` (500), `PRODUCT_IMPORT_MAX_IMAGES` (100 distinct image addresses per file), `PRODUCT_IMPORT_BATCH_SIZE` (20), `PRODUCT_IMPORT_IMAGE_CHECK_CONCURRENCY`, `PRODUCT_IMPORT_IMAGE_CHECK_TIMEOUT_MS`, `PRODUCT_IMPORT_IMAGE_FETCH_TIMEOUT_MS`, `PRODUCT_IMPORT_CLAIM_TIMEOUT_MS`, `PRODUCT_IMPORT_MAX_STALLED_CALLS`, `ADMIN_PRODUCT_IMPORT_HISTORY_PATH`.
5. A CSV saved with semicolons or tabs is refused with a message to save it as CSV (Comma delimited).
6. Known gaps: a product saved right before its row status update fails would show that row as Failed; the host of an image address can change its answer between the check and the download; battery health, hex colour, low stock threshold, SEO fields and add on picks aren't CSV columns yet, and a value can be replaced but not cleared by an update.
