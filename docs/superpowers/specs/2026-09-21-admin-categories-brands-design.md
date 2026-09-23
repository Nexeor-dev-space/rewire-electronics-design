# Admin Categories & Brands — design

Two catalogue modules in the staff console, wired end to end: Prisma models,
`/api/v1/admin` endpoints, React Query hooks and the screens that consume them.
No mocked data anywhere in the result.

- Routes: `/admin/categories`, `/admin/brands`
- Branch: `Feat-23-Categories-&-Brand-table`, based on `main` at `e5632fe`
- Status: agreed, not yet implemented

---

## 1. What this builds on

`main` already carries the whole data layer, landed with the Customers module
(PR #28). This module adds to it and duplicates none of it:

| Already there | Used for |
| --- | --- |
| `src/lib/api/api-response.ts` | `apiSuccess`, `apiError`, `ServiceError`, `apiErrorFrom` |
| `src/lib/api/api-client.ts` | `apiRequest`, `ApiError`, `apiFieldErrors` |
| `src/lib/api/api-endpoints.ts` | Every path, in one place |
| `src/lib/auth/session.ts` | `authorizeApi`, `getSession` |
| `src/lib/auth/permissions.ts` | `hasPermission`, `PERMISSIONS` |
| `prisma/schema/` | Split per-module schema layout |
| `src/components/ui/dialog.tsx` | `Dialog`, `DialogBody`, `DialogFooter` |
| `src/components/ui/confirm-dialog.tsx` | Delete confirmation |

The Users module (`user.service.ts`, `use-user.ts`, `user-management.tsx`,
`user-form-modal.tsx`) is the structural precedent. Where this spec is silent,
follow it.

`src/lib/admin-nav.ts` already declares both routes, so the sidebar rows,
breadcrumbs and active states exist. Creating `src/app/admin/categories/page.tsx`
takes the path over from the `[...slug]` placeholder automatically.

---

## 2. Decisions

Each of these was a real fork. The reasoning matters more than the choice.

### 2.1 `type` is derived, never stored

`parentId === null` means parent; anything else means child. The API returns
`type` as the issue specifies, computed on read. A stored `type` column is a
second source of truth that can disagree with `parentId`, and nothing would
detect the disagreement.

### 2.2 Names are globally unique, through a `nameKey` column

The obvious constraint — `@@unique([parentId, name])` — **does not work**.
Postgres treats every `NULL` as distinct in a unique index, so two top-level
categories both named "Laptops" would insert happily. Instead each row carries
`nameKey` (the name trimmed and lowercased) with a plain `@unique`. That gives a
real database constraint with no NULL hole, makes uniqueness case-insensitive,
and is the right rule for a taxonomy anyway: two categories called "Laptops"
under different parents would be indistinguishable in every picker that lists
them.

Uniqueness is also checked in the service so the failure arrives as a `name`
field error rather than a raw Prisma exception. The database constraint is the
backstop, not the message.

### 2.3 Depth is capped at two levels

A parent has children; a child has none. Enforced in the service, not the
schema — Prisma cannot express it. Three rules:

- A child's parent must itself be a root (`parentId === null`).
- A category that already has children cannot be given a parent.
- A category cannot be its own parent.

### 2.4 Images live in Postgres behind a storage adapter

`MediaAsset.data` is `Bytes`. `src/lib/storage/image-storage.ts` is a
three-method interface with a Prisma driver behind it, so moving to blob storage
later changes one file and touches no route, service or component.

This is the right shape for a few dozen category and brand images and the wrong
shape at catalogue scale — see §11.

### 2.5 `productCount` is omitted

The issue's response shape lists it, but there is no `Product` model yet. A field
hardcoded to `0` looks like a real count and would be read as one. Categories
return a real `childCount` instead. `productCount` arrives with the Products
module.

The consequence for deletion: "category has children" is a real block and is
implemented. "Category or brand has linked products" cannot be checked yet and is
not faked — the delete simply succeeds.

### 2.6 Lists paginate parents and nest children

`items` is a page of parent categories, each carrying its `children` inline. This
satisfies DATA-LAYER.md's "never return an unbounded list" — the page is bounded
at 20 parents — while giving the tree view in one request. Children are bounded
per parent by the nature of the data.

---

## 3. Data model

Two new schema files, following the split layout already in `prisma/schema/`.

### `prisma/schema/catalogue.prisma`

```prisma
/// A product category. Two levels only: a category with `parentId` null is a
/// parent, otherwise a child. `type` in the API is derived from this, never
/// stored — see docs/superpowers/specs/2026-09-21-admin-categories-brands-design.md.
model Category {
  id       String @id @default(cuid())
  name     String
  /// `name` trimmed and lowercased. The unique index lives here so that
  /// uniqueness ignores case, and so that top-level categories are covered:
  /// a composite unique on (parentId, name) would not constrain them,
  /// because Postgres treats each NULL parentId as distinct.
  nameKey  String @unique

  parentId String?
  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")

  imageId String?
  image   MediaAsset? @relation(fields: [imageId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([parentId])
  @@index([updatedAt])
  @@map("categories")
}

/// A manufacturer. Flat — brands have no hierarchy.
model Brand {
  id      String @id @default(cuid())
  name    String
  /// See Category.nameKey.
  nameKey String @unique

  imageId String?
  image   MediaAsset? @relation(fields: [imageId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([updatedAt])
  @@map("brands")
}
```

### `prisma/schema/media.prisma`

```prisma
/// An uploaded image, stored as bytes. Served by GET /api/v1/media/[id].
/// Behind `src/lib/storage/image-storage.ts`, so the bytes can move to object
/// storage without touching anything that references an asset.
model MediaAsset {
  id       String @id @default(cuid())
  mimeType String
  data     Bytes

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  categories Category[]
  brands     Brand[]

  @@map("media_assets")
}
```

### Migration

One migration, committed in the same commit as the models, per DATA-LAYER.md §2:

```bash
npm run db:migrate -- --name add-catalogue-taxonomy
```

Run by the repository owner — see §10.

---

## 4. Image pipeline

### Constants — `src/lib/media.ts`

Client-safe, so the upload field can reject a file before sending it:

```ts
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
```

### Adapter — `src/lib/storage/image-storage.ts`

```ts
export interface ImageStorage {
  put(input: { buffer: Buffer; mimeType: string }): Promise<{ id: string }>;
  get(id: string): Promise<{ data: Buffer; mimeType: string } | null>;
  /** Removes unreferenced assets older than the cutoff. Returns the count. */
  sweepOrphans(): Promise<number>;
}
```

There is deliberately no deduplication: `put` always writes a new row. A
checksum column was considered and dropped — uploading the same logo to five
brands stores five copies, which is the accepted cost of a smaller table.

`imageUrl(id)` returns `API_ENDPOINTS.media.detail(id)` — services compute the
URL so no component ever builds a path.

### Orphan sweep

Uploading an image and then cancelling the modal would strand a `MediaAsset`.
Every upload first deletes assets that are older than 24 hours and referenced by
no category and no brand. The cutoff protects an image uploaded seconds ago in a
modal still open. Self-maintaining, no scheduled job.

### Two sanctioned exceptions to the data-layer rules

Both are deliberate and both get recorded in `docs/DATA-LAYER.md`:

1. **`GET /api/v1/media/[id]` returns raw bytes, not `apiSuccess`.** An image
   cannot be wrapped in a JSON envelope. Responds with `Content-Type` from the
   row and `Cache-Control: public, max-age=31536000, immutable` — safe because
   the id identifies the content, and changing an image produces a new id.
2. **Upload uses `XMLHttpRequest`, not `apiRequest`.** `fetch` cannot report
   upload progress, and the issue requires the modal to show it. Confined to
   `src/lib/api/upload-client.ts`, which unwraps the same `ApiResponse` envelope
   and throws the same `ApiError`, so callers cannot tell the difference.

---

## 5. API

### Paths

```
GET  | POST            /api/v1/admin/categories
GET  | PUT  | DELETE   /api/v1/admin/categories/[id]
GET  | POST            /api/v1/admin/brands
GET  | PUT  | DELETE   /api/v1/admin/brands/[id]
POST                   /api/v1/uploads/images
GET                    /api/v1/media/[id]
```

**Deviation from the issue:** the issue writes `/api/categories`. DATA-LAYER.md
§5 mandates the `v1` prefix, and the Users module established the `admin`
grouping for console-only endpoints. The documented convention wins; the issue's
paths are indicative. `PUT` is used as the issue specifies — create and update
take the same complete body, so replacement semantics are correct.

### Authorisation

Every route opens with:

```ts
const auth = await authorizeApi(PERMISSIONS.categories);
if (!auth.ok) return auth.response;
```

Two keys added to `src/lib/auth/permissions.ts`:

```ts
categories: adminPermission("catalogue", "categories"),
brands: adminPermission("catalogue", "brands"),
```

`/api/v1/uploads/images` and `/api/v1/media/[id]` require a session with either
permission — the endpoint is shared by both modules.

### Query parameters — categories

| Query | Returns |
| --- | --- |
| *(none)* | A page of parents, each with `children` nested |
| `?type=parent` | A flat page of parents — the modal's parent picker |
| `?type=child` | A flat page of children |
| `?parentId=<id>` | A flat page of that parent's children |
| `?search=<text>` | Applied to any of the above |
| `?page=`, `?pageSize=` | Standard pagination, max 100 |

`parentId` implies children, so it wins over `type`: `?parentId=x&type=parent`
returns that parent's children, not parents. The combination is meaningless
rather than invalid, and rejecting it would buy nothing.

**Search semantics**, stated precisely because they are easy to get wrong in the
nested case: a parent is returned when its own name matches, or when any of its
children match. When the parent matched, all its children come back. When only
children matched, the parent comes back carrying just the matching children. In
the flat modes, search is a plain name match.

### Response shapes

```ts
interface CategorySummary {
  id: string;
  name: string;
  type: "parent" | "child";
  parentId: string | null;
  imageUrl: string | null;   // /api/v1/media/<id>, or null
  updatedAt: string;         // ISO — rendered as "Last edited"
}

interface CategoryChild extends CategorySummary { type: "child"; parentId: string }

interface CategoryNode extends CategorySummary {
  type: "parent";
  parentId: null;
  childCount: number;
  children: CategoryChild[];
}

interface CategoryDetail extends CategorySummary {
  imageId: string | null;
  /** Lets the modal disable "Child" for a category that already has children,
   *  rather than waiting for the server to refuse the save. */
  childCount: number;
}

interface BrandListItem {
  id: string;
  name: string;
  imageUrl: string | null;
  updatedAt: string;
}

interface BrandDetail extends BrandListItem { imageId: string | null }
```

- Default list → `Paginated<CategoryNode>`
- `type=` or `parentId=` → `Paginated<CategorySummary>`
- Brands list → `Paginated<BrandListItem>`
- Detail → `CategoryDetail` / `BrandDetail` (carries `imageId`, which the modal
  submits back unchanged when the image is untouched)
- `DELETE` → `{ id }`
- `POST /api/v1/uploads/images` → `{ id, url }`

---

## 6. Validators and types

### `src/validators/category.validator.ts`

```ts
export const CATEGORY_TYPES = ["parent", "child"] as const;

export const categoryListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
  type: z.enum(CATEGORY_TYPES).optional(),
  parentId: z.string().min(1).optional(),
});

export const categorySchema = z
  .object({
    name: z.string().trim().min(1, "Enter a category name.").max(80),
    type: z.enum(CATEGORY_TYPES, { error: "Choose a category type." }),
    parentId: z.string().min(1).nullable().default(null),
    imageId: z.string().min(1).nullable().default(null),
  })
  .superRefine((data, ctx) => {
    if (data.type === "child" && data.parentId === null) {
      ctx.addIssue({ code: "custom", path: ["parentId"], message: "Choose a parent category." });
    }
    if (data.type === "parent" && data.parentId !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["parentId"],
        message: "A parent category can't sit under another category.",
      });
    }
  });
```

`superRefine`, not `refine`, because the two failures need different messages on
the same path. A single `refine` would print one message for both.

### `src/validators/brand.validator.ts`

```ts
export const brandListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter a brand name.").max(80),
  imageId: z.string().min(1).nullable().default(null),
});
```

### Types

`src/types/category.ts` and `src/types/brand.ts` hold the interfaces from §5,
plus `CategoryFilters` / `BrandFilters` written as plain types rather than
`z.input`, because `z.coerce` inputs widen to `unknown` — the same note the
Users module carries.

The upload endpoint validates its multipart body in the route (file present,
mime in `IMAGE_MIME_TYPES`, size within `MAX_IMAGE_BYTES`); there is no Zod
schema for a `File`.

---

## 7. Services

`src/services/category.service.ts`, `brand.service.ts`, `media.service.ts`.
All `import "server-only"`, all throw `ServiceError` so routes stay thin and
`apiErrorFrom` maps the result.

### Category rules

| Rule | Failure |
| --- | --- |
| Name already taken (case-insensitive) | 409, field error on `name` |
| Child's parent does not exist | 422, field error on `parentId` |
| Child's parent is itself a child | 422 on `parentId` — "Choose a top-level category." |
| Category with children given a parent | 409 on `type` — names the child count |
| Category set as its own parent | 422 on `parentId` |
| Delete a parent that has children | 409 — "Laptops has 4 child categories. Move or delete them first." |

Every write runs in `prisma.$transaction`, so a uniqueness check and the insert
cannot interleave. `nameKey` is recomputed from `name` on every write — it is
derived, never submitted by the client, and never read by the UI.

### Image lifecycle

A shared helper releases the previous asset whenever `imageId` changes on update,
or when a row is deleted: if the old asset is referenced by no other category and
no brand, its row goes too. Combined with the orphan sweep, an image never
outlives its last reference by more than 24 hours.

### Brand rules

Name uniqueness and image release, as above. No delete block exists today —
there are no products to link to. When the Products module lands, the check goes
here.

---

## 8. Endpoints, hooks

### `src/lib/api/api-endpoints.ts`

```ts
admin: {
  users: { … },
  categories: { list: `${V1}/admin/categories`, detail: (id) => `${V1}/admin/categories/${id}` },
  brands:     { list: `${V1}/admin/brands`,     detail: (id) => `${V1}/admin/brands/${id}` },
},
uploads: { images: `${V1}/uploads/images` },
media:   { detail: (id: string) => `${V1}/media/${id}` },
```

### `src/hooks/use-category.ts`

`useGetCategories(filters)`, `useGetParentCategories()`, `useGetCategory(id)`,
`useCreateCategory()`, `useUpdateCategory()`, `useDeleteCategory()`.
Keys under `["categories"]`; every mutation invalidates `categoryKeys.all`;
lists use `placeholderData: keepPreviousData` so rows stay put while a search
loads; every `queryFn` passes `signal`.

`useGetParentCategories()` requests `type=parent&pageSize=100` for the picker.

### `src/hooks/use-brand.ts`

The same set without the parent query.

### `src/hooks/use-upload.ts`

```ts
export function useUploadImage() {
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: (file: File) => uploadImage(file, { onProgress: setProgress }),
    onMutate: () => setProgress(0),
  });
  return { ...mutation, progress };
}
```

---

## 9. UI

### Files

```
src/app/admin/categories/page.tsx
src/app/admin/brands/page.tsx
src/components/admin/categories/category-management.tsx
src/components/admin/categories/category-form-modal.tsx
src/components/admin/brands/brand-management.tsx
src/components/admin/brands/brand-form-modal.tsx
src/components/admin/shared/image-field.tsx
```

Both pages are Server Components that mirror `users/customers/page.tsx`: no
session → `redirect("/sign-in")`; a role without the permission → `AdminPage`
wrapping `AdminEmptyState` "Access denied".

### The list screens

Modelled on `user-management.tsx`: `AdminPage` with the add button in `actions`,
a search `Input` debounced at 300ms that resets to page 1, then the five states
DATA-LAYER.md §7 requires — skeleton, error with retry, empty (worded for "no
results" versus "nothing yet"), data, and per-row disabled state while a delete
is in flight.

The category table renders parents as rows with their children indented beneath,
so the mapping is visible rather than inferred. Columns: image thumbnail, name,
type badge, last edited, edit/delete. Brands are the same without type.

Pagination counts parents on the category screen; the footer wording says so, so
the number is not mistaken for a total category count.

### The modals

`Dialog` + `DialogBody` + `DialogFooter`, the shape `user-form-modal.tsx` uses:
an edit modal first fetches the detail and shows a skeleton, client-side
validation runs the same Zod schema the route uses, and server field errors
arrive through `apiFieldErrors(error)` into the same `errors` state — so a client
rule and a server rule render identically, which is what the issue asks for.

The category modal's type selector switches the parent picker on and off. Picking
"Child" reveals a `Select` fed by `useGetParentCategories()`; switching back to
"Parent" clears `parentId`.

### `ImageField`

Shared by both modals. Holds the current `imageId`, shows a preview in a fixed
aspect container using `next/image` with `fill` — DESIGN-SYSTEM.md §8 sanctions
an aspect container in place of explicit dimensions, which avoids parsing image
headers for width and height. Rejects a wrong type or oversized file before
uploading, shows a determinate progress bar during upload, shows the server's
message on failure with a retry, and offers "Remove" to clear the image.

### Shared component changes

Three, each small and each flagged because they touch code outside this module:

1. **`ConfirmDialog` gains `error?: string` and `loading?: boolean`.** The issue
   requires a rejected delete to show its message inside the modal, and today the
   dialog closes as soon as confirm is clicked. Both props are optional, so the
   Users module is unchanged. The delete flow becomes: confirm → button shows
   `loading` → success closes, failure keeps it open with `error` rendered
   `role="alert"`.
2. **`Field` moves from `address-list-editor.tsx` to `src/components/ui/field.tsx`.**
   It is a generic label + control + hint + error wrapper that these modals need,
   and importing it out of a Users-specific file would be wrong. The two Users
   files update their imports; the component itself does not change.
3. **`primitives.validator.ts` docstring** still says "the Prisma schema
   (`prisma/schema.prisma`)", which stopped being true when the schema was split.
   One-line correction.

---

## 10. Docs, commits and verification

### Docs updated in the same PR

- `docs/ADMIN-PANEL.md` — the two modules, and the new permission keys in the
  access-control section.
- `docs/DATA-LAYER.md` — the nested-list pattern, and the two exceptions in §4.3.

### Commits

Following the sequence DATA-LAYER.md §9 sets out:

```
feat(db): add category, brand and media asset models     schema + migration, one commit
feat(api): add category and brand endpoints              validators, types, services, routes, endpoints
feat(admin): add category and brand management screens   hooks, pages, components, shared UI changes
docs: document the catalogue taxonomy modules
```

### Verification

Split, because this session must not read `.env` — directly or through the
Prisma CLI, `next dev` or `next build`.

**Done here:** `npm run lint` and `npx tsc --noEmit`, with the real output
reported.

**Done by the repository owner:**

1. `npm run db:migrate -- --name add-catalogue-taxonomy`
2. `npm run build`
3. Drive both screens and confirm:
   - add a parent, add a child under it, both appear in the tree
   - search by name, debounced, matching a child surfaces its parent
   - edit a name, edit an image, "Last edited" moves
   - delete a parent with children → blocked, message shown in the modal
   - delete the children, then the parent → succeeds
   - cancel a delete → nothing is sent
   - a duplicate name → error on the name field, in the modal
   - upload a 3MB file → rejected before sending; upload a `.txt` → rejected
   - signed out, `curl` either endpoint → 401 rather than data

Note on the permission check: Admin and Staff both hold `"*"` today, and
Customer is turned away by `src/app/admin/layout.tsx` before a page renders, so
no current role exercises the access-denied branch on these screens. The branch
is written because `ROLE_PERMISSIONS` is where Staff gets narrowed later, and the
401 check above is the part that can actually be verified now.

Anything that fails comes back here and gets fixed.

---

## 11. Risks and known limits

1. **Image bytes in Postgres.** Right for a few dozen logos, wrong at catalogue
   scale — every read pulls bytes through the connection pool and every backup
   carries them. The adapter in §4 is the hedge: moving to object storage is one
   file. Revisit before the Products module adds per-product galleries.
2. **The parent picker is capped at 100.** `useGetParentCategories()` requests one
   page of 100. Beyond that, some parents would be missing from the picker. A
   typeahead replaces it if the taxonomy ever grows that far.
3. **No automated tests.** The repository has none and this PR does not add a
   framework. The service rules in §7 — depth, uniqueness, delete blocking — are
   the logic most worth covering when one arrives.
4. **Global name uniqueness may prove too strict.** If the catalogue ever wants
   "Cases" under both Phones and Laptops, §2.2 has to be revisited; the fix is a
   generated column plus a partial unique index, which needs hand-written
   migration SQL.
5. **A top-level name race is possible in theory.** The `nameKey @unique` index
   closes it at the database; the service check exists to produce a good message,
   not to be the guard.

## 12. Out of scope

Named explicitly so the boundary is not argued later:

- Rewiring the storefront. `src/lib/categories.ts` keeps feeding the navbar,
  drawer, homepage rail and mega-menu. Connecting them is its own issue.
- `productCount`, and delete-blocking on linked products — both need the Products
  module.
- Category ordering, slugs, SEO fields, brand pages, bulk upload.
- Seed data. Both screens open on their empty state.
- Narrowing `ROLE_PERMISSIONS` for Staff; today Staff has `"*"`.
