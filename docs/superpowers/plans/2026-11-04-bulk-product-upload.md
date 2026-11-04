# Bulk Product Upload (CSV) Implementation Plan

Issue #110. Replaces the "Coming soon" placeholder at `/admin/products/upload-products` and `/admin/products/upload-history` with a working CSV import for products and variants.

Status: built. This is the original plan. Where it differs from the code, docs/BULK-UPLOAD.md is right. Differences: the browser sends parsed rows as JSON, not a multipart file; the preview page size is the existing `ADMIN_PAGE_SIZE` (20); the permission is `catalogue.bulk-upload` plus the matching Products permission; a file is capped at 100 distinct image addresses; each saved product has its own Change Log entry.

The work is split in two parts so that everything that does not touch the database can start now, and the database change waits for explicit approval.

1. Part 1: no database change. Template, upload, parsing, validation, preview.
2. Part 2: needs a migration. Persisted imports, processing, history, error reports.

---

## 0. What the codebase already gives us

1. Stock lives on `ProductVariant.stock`. There is no inventory table or screen (docs/CATALOGUE.md rule 11). The issue's "Inventory module" is therefore the product variant stock, and importing stock means writing that column.
2. `productSchema` in `src/validators/product.validator.ts` already holds every product and variant rule: SKU pattern, grade only on pre owned and refurbished, compare at price above price, unique SKU and option combination inside a product, image colour must match a variant colour. The import reuses it instead of copying rules.
3. `createProduct` in `src/services/product.service.ts` already runs in one transaction and checks slug, SKU (Trash included) and brand and category references. A create row can call it as is.
4. `updateProduct` replaces images and specs and deletes variants that are left out. That is wrong for an import, so Update Existing needs its own narrow function (section 2.4).
5. `src/lib/csv.ts` has `toCsv` and `downloadCsv` (UTF 8 BOM, formula escaping). Reuse for the template and the error report. It has no parser, so a parser is new code.
6. `recordAudit`, `refreshStorefrontCatalogue`, `authorizeApi`, `apiSuccess` and `apiError` are reused unchanged.
7. The nav row `bulk-upload` already exists in `src/lib/admin-nav.ts` with both routes, but it has no entry in `PERMISSIONS` and the pages are not in `BUILT_ROUTES` in `src/app/admin/[...slug]/page.tsx`.
8. Images are stored as bytes in `MediaAsset` through `imageStorage`. Money is an `Int` in fils.

---

## 1. CSV format (shared by both parts)

One CSV row is one variant. Rows that share a Product Slug form one product, and the product level columns are read from the first row of the group (a later row that disagrees is a validation error).

| Column | Required | Maps to |
| --- | --- | --- |
| product_name | Yes | `Product.name` |
| product_slug | Yes | `Product.slug` |
| description | No | `Product.description` |
| brand | Yes | Brand name, matched on `Brand.nameKey` |
| category | Yes | Category slug |
| product_status | No, default DRAFT | `Product.status` |
| warranty_months | No, default 12 | `Product.warrantyMonths` |
| images | No | Image URLs separated by `\|`, https only |
| specifications | No | `Group::Label::Value` entries separated by `\|` |
| sku | Yes | `ProductVariant.sku`, the match key for updates |
| variant_name | No | Display only, kept in the preview and never stored (the schema has no variant name; storage, colour and condition describe a variant) |
| condition | Yes | `ProductVariant.condition` |
| grade | No | `ProductVariant.grade`, only for PRE_OWNED or REFURBISHED |
| storage | No | `ProductVariant.storage` |
| colour | No | `ProductVariant.colour` |
| price | Yes | Decimal AED in the file, converted to fils |
| compare_at_price | No | Decimal AED, converted to fils |
| stock | Yes | `ProductVariant.stock` |

Column names, limits and enum values come from constants and from the arrays already exported by `product.validator.ts`. Nothing is typed twice.

The template is built on the client from the column list with `toCsv` and `downloadCsv`, includes two sample products (one with two variants), and has a second heading row marking each column Required or Optional. The parser skips that heading row, so a template filled in and uploaded works unchanged.

---

## 2. Part 1: no database change

Everything here is stateless. Nothing is written to the database and no migration is needed.

### 2.1 Files added

| File | Purpose |
| --- | --- |
| `src/lib/product-import.ts` | Column list, headers, template rows, size and row limits, parse helpers. Client safe |
| `src/validators/product-import.validator.ts` | Zod schema for one parsed row, the grouping check, and the mapper from a row group to `productSchema` input |
| `src/services/product-import.service.ts` | `validateImport(rows, mode)` returns the preview. Looks up brands, categories, existing slugs and SKUs in a few batched queries |
| `src/app/api/v1/admin/product-imports/validate/route.ts` | `POST` multipart file plus mode, returns the preview |
| `src/hooks/use-product-import.ts` | `useValidateProductImport` mutation |
| `src/components/admin/product-import/*` | Step layout, drop zone, preview table, mode select |
| `src/app/admin/products/upload-products/page.tsx` | The screen |
| `docs/BULK-UPLOAD.md` | New module doc |

### 2.2 Files changed

1. `src/lib/auth/permissions.ts`: add `PERMISSIONS.bulkUpload = adminPermission("catalogue", "bulk-upload")` and a module row with actions `VIEW` and `CREATE`. Admin always passes; Staff need the grant. Saved role rows are plain keys, so this should need no migration; confirm in `staff-role.service.ts` before building.
2. `src/lib/api/api-endpoints.ts`: the validate endpoint path.
3. `src/app/admin/[...slug]/page.tsx`: add the two routes to `BUILT_ROUTES`.
4. `src/lib/audit.ts`: nothing in Part 1.
5. `docs/CATALOGUE.md`, `docs/PERMISSIONS.md`, `docs/ADMIN-PANEL.md`, `AGENTS.md` (doc table row): point to the new doc.

### 2.3 Behaviour

Upload step.
1. Drop zone plus a Choose file button. Accepts `.csv` only, checks extension and MIME on the client and again on the server.
2. Size limit and row limit are enforced before parsing. Over either limit is a clear error, not a partial read.
3. Shows the file name and a status (reading, validated, failed). A Remove or Replace button clears it and goes back to the first step.
4. Corrupt or empty files, a missing header, an unknown or missing required column, and a file with only the heading rows each give a specific message.

Parsing.
1. A small RFC 4180 parser (quotes, doubled quotes, commas and line breaks inside quotes, BOM, CRLF) in `src/lib/product-import.ts`. No new dependency.
2. Header names are matched case insensitively and trimmed.

Validation, in this order, all before any write (there is no write in Part 1).
1. Row shape: required cells present, numbers parse, enums valid.
2. Group rows by slug, check product level cells agree across the group.
3. Run each group through `productSchema.safeParse`. Zod issue paths such as `variants.1.price` are mapped back to the CSV row and column, so the error reads "Row 7, price: Enter a price above zero."
4. References: brand exists, category exists and is not archived. A missing one is an error. The import never creates brands or categories.
5. Duplicates inside the file: same SKU on two rows, same slug split into different products.
6. Against the database, by mode:
   1. Create New: slug or SKU already exists is an error (Trash included, with the existing "restore it first" wording).
   2. Update Existing: SKU must exist, and a SKU that belongs to a different product than the row's slug is an error. A variant SKU not found is an error, since this mode never creates.
7. Images: each URL must be https, and the host must resolve to a public address (blocks localhost and private ranges, because the server will fetch it in Part 2). The preview does a HEAD request with a short timeout to check it is reachable and an image. Image count is capped at `MAX_IMAGES`.
8. Published rows need at least one image (same rule as `setProductStatus`).

Preview.
1. Table: row number, product name, variant details (storage, colour, condition), SKU, price, stock, action (Create or Update), status, errors.
2. Paginated and filterable by All, Valid, Errors. Summary above it: rows, products, valid, invalid.
3. If any row is invalid the Continue button is disabled and the message says to fix the file and upload again. The whole file must be clean before import (see open question 1).
4. Update Existing preview shows which fields change (old and new price and stock) so nothing is overwritten by surprise.

Part 1 ends at the preview. The Continue button is shown disabled with "Import arrives with the history update" until Part 2 ships, or the screen is left unlinked, as you prefer.

### 2.4 Update Existing rules (decided here, built in Part 2)

1. Match on SKU only.
2. A blank cell means keep the current value. A filled cell replaces it. This is the "no unintended overwrite" rule.
3. Variant fields updatable: price, compare at price, stock, condition, grade, storage, colour. SKU itself is not changed.
4. Product fields updatable when present: name, description, brand, category, status, warranty months.
5. Images and specifications are only replaced when the cell is filled, and then the whole set is replaced, matching the form's behaviour. Released images use the existing `releaseImage`.
6. Variants absent from the file are left alone. Nothing is deleted by an import.
7. `minPrice` is recomputed from all variants of the product after the change.

### 2.5 Tests (Part 1)

Vitest, matching the existing `*.validator.test.ts` files.
1. Parser: quotes, commas, line breaks, BOM, empty file, ragged rows.
2. Row mapping and grouping, including conflicting product cells.
3. Zod path to CSV row and column mapping.
4. Template round trip: the downloaded template parses and validates.
5. Money conversion of decimal AED to fils.

---

## 3. Part 2: database change (needs your approval first)

Do not generate or run any migration until you confirm.

### 3.1 Why a migration is needed

The issue requires history, per row results, error reports, progress, and protection against processing the same import twice. None of that can live in memory or in a stateless request. A large file also has to be processed in batches, which needs the validated rows stored between requests.

### 3.2 Exactly what changes

New file `prisma/schema/product-import.prisma`. New tables only. No existing table or column is altered.

```prisma
enum ProductImportMode { CREATE_NEW UPDATE_EXISTING }

enum ProductImportStatus { PENDING PROCESSING COMPLETED COMPLETED_WITH_ERRORS FAILED }

enum ProductImportRowStatus { PENDING IMPORTED FAILED }

model ProductImport {
  id             String              @id @default(cuid())
  fileName       String
  mode           ProductImportMode
  status         ProductImportStatus @default(PENDING)
  totalRows      Int
  importedRows   Int                 @default(0)
  failedRows     Int                 @default(0)
  uploadedById   String?
  uploadedBy     User?               @relation(fields: [uploadedById], references: [id], onDelete: SetNull)
  uploadedByName String
  startedAt      DateTime?
  completedAt    DateTime?
  rows           ProductImportRow[]
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@index([createdAt])
  @@index([status])
  @@map("product_imports")
}

model ProductImportRow {
  id          String                 @id @default(cuid())
  importId    String
  import      ProductImport          @relation(fields: [importId], references: [id], onDelete: Cascade)
  rowNumber   Int
  productName String
  sku         String
  data        Json
  status      ProductImportRowStatus @default(PENDING)
  error       String?
  productId   String?
  createdAt   DateTime               @default(now())

  @@unique([importId, rowNumber])
  @@index([importId, status])
  @@map("product_import_rows")
}
```

Notes.
1. `uploadedByName` is a snapshot so history still reads after a user is removed, like `AuditLog.actorName`.
2. `productId` is a plain string, not a foreign key, so purging a product never breaks history.
3. `User` gets the back relation field only, which is not a database change.
4. One migration, named `add_product_imports`, committed in the same commit as the schema, as AGENTS.md requires.
5. Backwards compatible and reversible by dropping the three new tables. No data is migrated.

### 3.3 Files added

| File | Purpose |
| --- | --- |
| `prisma/schema/product-import.prisma` | The models above |
| `src/validators/product-import.validator.ts` (extend) | History query schema, process request schema |
| `src/services/product-import.service.ts` (extend) | `createImport`, `processImportBatch`, `listImports`, `getImport`, `listImportRows`, `buildErrorReport` |
| `src/app/api/v1/admin/product-imports/route.ts` | `GET` history list (paginated), `POST` upload: validates and stores the import as PENDING |
| `src/app/api/v1/admin/product-imports/[id]/route.ts` | `GET` detail with counts |
| `src/app/api/v1/admin/product-imports/[id]/rows/route.ts` | `GET` rows, filter by status, paginated |
| `src/app/api/v1/admin/product-imports/[id]/process/route.ts` | `POST` process the next batch |
| `src/app/api/v1/admin/product-imports/[id]/errors/route.ts` | `GET` error report CSV |
| `src/app/admin/products/upload-history/page.tsx` | History table |
| `src/components/admin/product-import/*` (extend) | Progress bar, history table, detail drawer |

### 3.4 Files changed

1. `src/lib/api/api-endpoints.ts`: the new paths.
2. `src/hooks/use-product-import.ts`: queries for history, detail and rows; mutations for upload and process. Mutations invalidate the `["product-imports"]` key and the products list key.
3. `src/lib/audit.ts`: a label for the bulk upload module.
4. `docs/BULK-UPLOAD.md`, `docs/CATALOGUE.md` (migrations table), `docs/DATA-LAYER.md` only if a convention changes, `docs/TRASH-AUDIT.md` (new audit module).

### 3.5 Processing design

1. **Upload** (`POST product-imports`): runs the Part 1 validation. If any row is invalid it returns the preview and stores nothing. If all rows are valid it creates the `ProductImport` (PENDING) and its rows in one transaction.
2. **Start and progress**: the browser calls `POST product-imports/[id]/process` in a loop. Each call handles one batch of products and returns `{ status, importedRows, failedRows, totalRows }`, which drives the progress bar. No worker, no polling job, no extra server load while nobody is importing.
3. **Batch unit**: one product (all its variant rows) in one transaction, the same as `createProduct` today. A product that fails rolls back completely, its rows are marked FAILED with the error, and the batch moves on. So no half imported product can exist.
4. **No double processing**: the first call moves the import PENDING to PROCESSING with a conditional `updateMany`. Only rows with status PENDING are picked, and each is marked IMPORTED or FAILED inside the same transaction as its product write. A repeated or concurrent call therefore finds nothing left to do. A call on a finished import returns its result unchanged.
5. **Re-validation at write time**: rows were validated at upload, but slugs and SKUs can be taken in between, so each product re-runs the database checks inside its transaction. A clash becomes a FAILED row.
6. **Finish**: when no PENDING rows remain, status becomes COMPLETED (no failures), COMPLETED_WITH_ERRORS (some), or FAILED (none imported). `completedAt` is set, one `recordAudit` entry is written for the whole import, and `refreshStorefrontCatalogue()` runs once.
7. **Images**: fetched server side at import time, with the same type and size rules as `saveImage`, a request timeout, and the public host check from Part 1. A product whose image fails is a failed product, not a product without images.
8. **Interrupted run**: if the tab closes mid import the status stays PROCESSING with some rows PENDING. Reopening the import detail shows a Resume button that continues the loop. Nothing is lost or duplicated.
9. **Error report**: the failed rows with row number, SKU, product name and reason, built with `toCsv` and downloaded with `downloadCsv`.

### 3.6 History UI

1. Table columns as in the issue: Import ID, file name, uploaded by, date and time, total, imported, failed, status badge, actions.
2. Actions: View details, Download error report (only when failed rows exist), Resume (only when PROCESSING).
3. Detail view with tabs: Imported, Failed (with error messages). Rows paginated.
4. Loading, empty, error and data states on every list, per DATA-LAYER.md.

### 3.7 Tests (Part 2)

1. Service tests for batch processing: all good, one bad product among good ones, repeat call is a no op, clash created between upload and process.
2. Status roll up: COMPLETED, COMPLETED_WITH_ERRORS, FAILED.
3. Update Existing: blank keeps, filled replaces, absent variants untouched, `minPrice` recomputed.
4. Permission checks on every route (no grant gets 403).
5. Manual end to end pass: 3 products with 5 variants, a deliberately broken file, an update run, history and error report download, products appear in the Products screen with the right stock.

---

## 4. Environment, performance and breaking changes

1. No new environment variable.
2. No breaking change. Existing product APIs and screens are untouched.
3. Server load: parsing is in memory under the file limit, validation uses a handful of batched `IN` queries (not one per row), processing is one small transaction per product.

---

## 5. Decisions I need from you before building

These numbers and rules touch limits and behaviour you asked to approve.

1. **Limits.** Proposed: file up to 2 MB, up to 500 rows, 20 products per process call, preview page size 25. All would be constants in `src/lib/constants.ts`.
2. **All or nothing at upload.** Proposed: a file with any invalid row cannot be imported; fix and re upload. The issue says "correct the CSV and upload again", which matches. The alternative is importing the valid rows and failing the rest.
3. **Images by URL.** Proposed: https URLs fetched by the server, with a public host check. The alternative is no images in the CSV and adding images in the product form afterwards, which removes the outbound fetch and its security surface, but then PUBLISHED rows are not possible.
4. **Variant Name.** The schema has no such field. Proposed: accept the column for readability, show it in the preview, do not store it.
5. **Brands and categories.** Proposed: must already exist, never auto created. Brand by name, category by slug.
6. **Part 2 migration.** Please confirm the three new tables in section 3.2 before I generate any migration.
7. **Permission.** Proposed: new `catalogue.bulk-upload` module with View and Create, Staff roles opt in.
