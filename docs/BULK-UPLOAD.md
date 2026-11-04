# Bulk Product Upload

Create or update products and their variants from a CSV file, with every row checked before anything is saved. Issue #110. The full plan is in [superpowers/plans/2026-11-04-bulk-product-upload.md](superpowers/plans/2026-11-04-bulk-product-upload.md).

Read this before you change the import columns, the validation rules or the Bulk Product Upload screen. [CATALOGUE.md](CATALOGUE.md) covers the product model the import writes to.

---

## 1. Status

| Part | State |
| --- | --- |
| Part 1: template, upload, validation, preview | Built. No database change |
| Part 2: saving the import, progress, history, error report | Not built. Needs a migration that has not been approved |

Until Part 2 ships the screen stops at the preview. The Import button is disabled and nothing is written to the database.

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

## 5. Files

| File | Purpose |
| --- | --- |
| `src/lib/product-import.ts` | Columns, template, modes, CSV reader. Client safe |
| `src/lib/product-import-analyse.ts` | Pure row checking and preview building |
| `src/lib/public-address.ts` | Whether the server may fetch from a host |
| `src/types/product-import.ts` | `ImportPreview`, `ImportPreviewRow` |
| `src/validators/product-import.validator.ts` | Request schema |
| `src/services/product-import.service.ts` | `validateImport` |
| `src/app/api/v1/admin/product-imports/validate/route.ts` | `POST` validate |
| `src/hooks/use-product-import.ts` | `useValidateProductImport` |
| `src/components/admin/product-import/` | Screen, drop zone, preview table |
| `src/app/admin/products/upload-products/page.tsx` | The page |

## 6. API

`POST /api/v1/admin/product-imports/validate`

Request body: `{ mode: "CREATE_NEW" | "UPDATE_EXISTING", columns: string[], rows: ImportRow[] }`. Up to 500 rows. Requires `catalogue.bulk-upload` with Create.

Response: an `ImportPreview` with `totalRows`, `productCount`, `validRows`, `invalidRows` and one `ImportPreviewRow` per CSV row, each with its `action`, `changes` and `errors` (a column and a message). A 422 carries a file level message when a required column is missing.

## 7. Permission

Module `catalogue.bulk-upload` with View and Create, in `PERMISSIONS.bulkUpload`. Admin has both. A Staff role gets View at the View level and Create at the Edit level. Without Create the page shows but the upload is hidden, and the route answers 403.

## 8. Configuration, database and breaking changes

1. No environment variable and no database change in Part 1.
2. No breaking change.
3. Known gaps: battery health, hex colour, low stock threshold, SEO fields and add on picks aren't CSV columns yet. Part 2 will fetch images at import time and must connect to the address it has just checked, so a host can't change its answer in between.
