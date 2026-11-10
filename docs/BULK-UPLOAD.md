# Bulk Product Upload

Create or update products and their variants from a CSV file or the Excel product sheet, with every row checked before anything is saved. Issue #110 built the CSV path; the Excel sheet was added on `feat/138`. The CSV plan is in [superpowers/plans/2026-11-04-bulk-product-upload.md](superpowers/plans/2026-11-04-bulk-product-upload.md).

Read this before you change the import columns, the validation rules or the Bulk Product Upload screen. [CATALOGUE.md](CATALOGUE.md) covers the product model the import writes to.

---

## 1. Status

| Part | State |
| --- | --- |
| Part 1: template, upload, validation, preview | Built. No database change |
| Part 2: saving the import, progress, history, error report | Built. Migration `add_product_import` |
| Part 3: Excel product sheet, Skipped rows, importing the valid products of a file | Built. Migration `add_import_skipped_and_product_gtin` |

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

### The Excel product sheet

The Rewire product sheet (.xlsx) is uploaded as it is, with Create New only. The browser reads it (`read-excel-file/browser`, loaded only when a .xlsx is chosen), so the server does no parsing. `parseTemplateSheet` in `src/lib/product-import-template.ts` turns it into the same rows a CSV produces, and the rest of the pipeline is shared.

The screen offers a blank copy to download, `public/templates/rewire-product-upload-sheet.xlsx` (`PRODUCT_IMPORT_EXCEL_TEMPLATE_PATH`). It sits in `public/`, so anyone with the address can fetch it; it holds no products, but its Field Reference tab names internal fields. A test checks that it matches `TEMPLATE_HEADERS`, so replacing the file with one whose columns differ fails the test suite.

Only the Products tab is read. Row 1 is section titles, row 2 must match the template's 54 headers in order (a trailing `*` is ignored), and data starts on row 3. Row numbers in messages match Excel. Blank rows are ignored.

**Row types.**

1. Simple: one product with one variant.
2. Parent: the product's shared cells. It makes no row of its own, and its stock is left blank.
3. Variant: one buyable combination. It finds its Parent by product code, then by product name. These are rejected, and every row involved is reported: a Variant with no match, a Variant with a Parent's code but a different product name, a Parent with no Variants, two Parents sharing a code and their Variants, a product name shared by two Parents when a Variant has to link by name, and two products that would share a URL slug.
4. A Variant marked Visible on site No under a Parent marked Yes is rejected, because a product is shown or hidden as a whole.

**SKUs.** A code is upper cased. A Variant that repeats its Parent's code gets the values of its defining attributes added, joined with hyphens because the SKU rule refuses spaces: `RW-IP14P-256GB-SPACE-BLACK`. A Variant with its own code keeps it.

**Mapping.** Product cells come from the Simple or Parent row and are written on the product's first row. Variant cells come from each Simple or Variant row.

| Sheet column | Maps to |
| --- | --- |
| Product name, Brand, Category | `Product.name`. Brand matches `Brand.nameKey`; Category matches a slug or `Category.nameKey`. Neither is ever created |
| URL slug | `Product.slug`. Blank means generated from the name. A clash is an error |
| GTIN / barcode | `Product.gtin`, 8 to 14 digits, unique. Ignored on Variant rows |
| Short description, Full description | `Product.shortDescription`, `Product.description` |
| Highlights, What's in the box | `Product.highlights`, `Product.included`, one item per line |
| Key specifications | `ProductSpec`, one `Label: Value` per line, in the group Specifications |
| Warranty | `Product.warrantyMonths`, from the text's opening length (`12 months`, `1 year`) |
| Visible on site | `Product.status`: Yes is PUBLISHED, No is DRAFT |
| SEO title, Meta description, Focus keyword | `Product.seoTitle`, `Product.metaDescription`, `Product.metaKeywords` |
| Condition grade | `ProductVariant.grade`: A is PREMIUM, B is EXCELLENT, C is GOOD. `condition` is always REFURBISHED |
| Battery health, Selling price, Stock on hand | `ProductVariant.batteryHealth`, `price`, `stock` |
| Price when new | `ProductVariant.compareAtPrice`. Equal to the selling price means none |
| Image files or URLs, Image alt texts | `ProductImage`, https addresses only, comma separated. Parent and Variant images are combined and deduplicated. A Variant's image is tagged with its colour unless two colours share the address |
| Attribute named Storage or Colour | `ProductVariant.storage`, `colour` |
| Any other attribute | `ProductSpec` in the group Specifications. Defining a variant with it is refused |

**Not imported.** Featured, Returnable, Allow backorders, Length, Width, Height, Weight and the promo columns have no place in the schema. The preview lists any that are filled. Promotions run through Campaigns, see [CAMPAIGNS.md](CAMPAIGNS.md). Notes for Rewire team is never read.

**Rejected rows.** Problems only the sheet can see (a blank required cell, a missing Parent, an unknown grade) travel with the row as `templateErrors`, and the server reports them as row errors. Problems on a Parent's cells name the Parent's row. A file level problem, such as a renamed column, stops the upload with one message.

---

## 3. Modes

**Create New.** Adds products. A product whose SKUs are all stored under its slug is **Skipped**, so uploading the same file twice changes nothing. Any other clash is an error: a SKU on another product, a slug held by another product, anything in Trash, or new variants for a stored product. Add those on the product instead. Brand and category must already exist and are never created. A category that is archived is refused.

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
4. `validateImport` in `src/services/product-import.service.ts` looks up brands, categories, slugs, GTINs and SKUs in five batched queries, never one query per row.
5. Every distinct image address is checked once: https only, the host must resolve to a public address (`src/lib/public-address.ts`, which refuses loopback, private and link local ranges), and a HEAD request must answer with a PNG, JPEG, WebP or AVIF under 2 MB. A redirect is refused. At most `PRODUCT_IMPORT_IMAGE_CHECK_CONCURRENCY` addresses are checked at once, each with a `PRODUCT_IMPORT_IMAGE_CHECK_TIMEOUT_MS` timeout.
6. A product set to PUBLISHED needs at least one image, the same rule as publishing from the product form.

Create New imports a file when at least one product is ready. A product with any invalid row is left out whole, and its other rows say `Not imported: row N of this product has an error`. The preview's Errors filter lists them before the import, and the results show them after it.

Update Existing stays all or nothing: every row must be valid, because a partial price change can't be rolled back.

---

## 5. Saving and running an import

1. **Import.** The screen sends the same rows again to `POST /api/v1/admin/product-imports`. The server runs the whole validation a second time, image addresses included, so a row the preview refused can't slip through. It refuses the file when nothing can be imported, or when an update has any invalid row. Otherwise it stores one `product_imports` row (Pending) and one `product_import_rows` row per file row: Pending, Skipped, or Failed with its reason. Nothing is in the catalogue yet. From here the import survives a refresh.
2. **Batches.** The screen then calls `POST /api/v1/admin/product-imports/[id]/process` again and again. Each call saves up to `PRODUCT_IMPORT_BATCH_SIZE` (20) products and answers with the import's counts, which drive the progress bar. There is no background worker and no polling job.
3. **One product at a time.** Create New saves all rows of a product together through `createProduct`, in one transaction, so a product is saved whole or not at all. Update Existing saves one row at a time in one transaction. A product that fails is marked Failed with the reason, and the batch carries on.
4. **Checked again at write time.** A slug or SKU can be taken between upload and import, so each product is validated again against what is stored now. A clash becomes a Failed row. A product found to be fully stored by then becomes Skipped.
5. **No double processing.** A row is claimed (its `productId` is set to `claimed`) before it is saved, and only Pending unclaimed rows are picked. A repeated or parallel call finds nothing to do, and a finished import answers with its result unchanged.
6. **Images.** Each distinct address is downloaded once at import time with the same checks as the preview (public host, no redirect, image type, 2 MB) and stored as a `MediaAsset`. A product whose image fails is a failed product. An address used by several rows of a batch is downloaded once. The host is checked just before the download, but the download resolves it again, so the address is not pinned between the two.
7. **Finish.** When no Pending row is left the status becomes Completed (no failures), Completed with Errors (some) or Failed (none imported). The one request that closes the import writes one Change Log entry under Bulk Product Upload and refreshes the storefront catalogue. Each product saved also gets its own Change Log entry under Products (Created or Updated), marked `source: Bulk Product Upload`, so a changed price can be traced to the product.
8. **Resume.** If the tab closes midway the import stays Pending or Processing. Import history shows a Resume button that carries on with the rows that are left.
9. **Report of invalid rows.** The results list the failed rows with row number, SKU, product and reason (`ImportRowsList`, paginated). The same rows download as a CSV from the screen or from Import history.

If the server stops in the middle of saving a product, that product's rows stay claimed. A claim older than `PRODUCT_IMPORT_CLAIM_TIMEOUT_MS` (5 minutes, counted from the last batch) is released by the next call, and the rows are saved then. A request that is still running refreshes the import's `updatedAt` before each product, so its claims are not released.

The screen and the Resume button stop asking after `PRODUCT_IMPORT_MAX_STALLED_CALLS` (3) batches in a row that save nothing, and say so. `runImportToEnd` in `src/lib/product-import.ts` does this for both.

Create New can also set `product_status`. `createProduct` takes an optional status for this, so a published product is created in one step with its `publishedAt`.

## 6. Files

| File | Purpose |
| --- | --- |
| `src/lib/product-import.ts` | Columns, template, modes, CSV reader. Client safe |
| `src/lib/product-import-template.ts` | The Excel product sheet: `TEMPLATE_HEADERS`, `parseTemplateSheet`, `readTemplateFile`. Client safe |
| `public/templates/rewire-product-upload-sheet.xlsx` | The blank Excel product sheet the screen offers |
| `src/lib/product-import-analyse.ts` | Pure row checking and preview building, `storedRowOutcome`, `describeImportError` |
| `src/lib/public-address.ts` | Whether the server may fetch from a host |
| `src/types/product-import.ts` | `ImportPreview`, `ImportPreviewRow` |
| `src/validators/product-import.validator.ts` | Request schema |
| `src/services/product-import.service.ts` | `validateImport`, `loadLookups`, image address checks |
| `src/services/product-import-run.service.ts` | `createImport`, `processImport`, `listImports`, `getImport`, `listImportRows`, `listFailedRows` |
| `prisma/schema/product-import.prisma` | `ProductImport`, `ProductImportRow` |
| `src/app/api/v1/admin/product-imports/` | The routes in section 7 |
| `src/hooks/use-product-import.ts` | Queries and mutations for validate, create, process, history and the error report |
| `src/components/admin/product-import/` | Upload screen, drop zone, preview table, the row list `ImportRowsList`, history and detail |
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

Request body: `{ mode: "CREATE_NEW" | "UPDATE_EXISTING", columns: string[], rows: ImportRow[] }`. Up to 500 rows. Requires `catalogue.bulk-upload` with Create. A row may also carry the Excel only cells (`shortDescription`, `gtin`, `highlights`, `included`, `batteryHealth`, `imageAlts`, `imageColours`, `seoTitle`, `metaDescription`, `focusKeyword`), `parentRowNumber` and `templateErrors`. All default to blank.

Response: an `ImportPreview` with `totalRows`, `productCount`, `validRows`, `invalidRows`, `skippedRows` and one `ImportPreviewRow` per row, each with its `action` (`CREATE`, `UPDATE`, `SKIP` or null), `changes` and `errors` (a column and a message). A 422 carries a file level message when a required column is missing.

An import record also carries `skippedRows`, and the rows endpoint accepts `status=SKIPPED`. `POST /api/v1/admin/product-imports` answers 422 when no row can be imported, or when an Update Existing file has an invalid row.

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
3. Database: migration `add_import_skipped_and_product_gtin` adds `SKIPPED` to `ProductImportRowStatus`, `product_imports.skippedRows` (default 0), and `products.gtin` (nullable, unique) and `products.shortDescription` (default empty). Existing rows take the defaults. Postgres can't easily remove an enum value, so reversing it is manual.
4. Behaviour change for CSV Create New too: a file with some invalid rows now imports its valid products, and a product already stored is skipped instead of refusing the file. `createProduct` gained an optional second argument.
5. Constants in `src/lib/constants.ts`: `SHORT_DESCRIPTION_MAX_LENGTH` (200), `GTIN_MAX_LENGTH` (14), `PRODUCT_IMPORT_MAX_BYTES` (2 MB), `PRODUCT_IMPORT_MAX_ROWS` (500), `PRODUCT_IMPORT_MAX_IMAGES` (100 distinct image addresses per file), `PRODUCT_IMPORT_BATCH_SIZE` (20), `PRODUCT_IMPORT_IMAGE_CHECK_CONCURRENCY`, `PRODUCT_IMPORT_IMAGE_CHECK_TIMEOUT_MS`, `PRODUCT_IMPORT_IMAGE_FETCH_TIMEOUT_MS`, `PRODUCT_IMPORT_CLAIM_TIMEOUT_MS`, `PRODUCT_IMPORT_MAX_STALLED_CALLS`, `ADMIN_PRODUCT_IMPORT_HISTORY_PATH`.
6. A CSV saved with semicolons or tabs is refused with a message to save it as CSV (Comma delimited).
7. Known gaps: the host of an image address can change its answer between the check and the download; battery health, hex colour, low stock threshold, SEO fields and add on picks aren't CSV columns yet; a value can be replaced but not cleared by an update; the short description is stored and editable but no storefront screen shows it yet; a batch of 20 products can mean about 70 image downloads in one request, so lower `PRODUCT_IMPORT_BATCH_SIZE` if it times out.
