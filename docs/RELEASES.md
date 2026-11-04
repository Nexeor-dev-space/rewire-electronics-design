# Releases

How staff run limited drops: a release with its own schedule, several products
and variants, stock set aside per variant and a purchase limit per customer.

Read this before you change `prisma/schema/release.prisma`,
`src/lib/releases.ts`, `src/services/release.service.ts`,
`src/services/release-allocation.service.ts`, a release API route or the admin
Releases screens. [CATALOGUE.md](CATALOGUE.md) covers products and variants,
[PERMISSIONS.md](PERMISSIONS.md) covers access levels.

Issue #108 is delivered in four parts. This document covers part 1, release
management (#116). The storefront pages and waitlists (#117), the emails (#118)
and the checkout holds (#119) add their own sections as they land.

There is no limit on releases per month, and schedules may overlap. Each
release keeps its own schedule, allocations and limit.

---

## 1. What this module covers

| Area | What exists |
| --- | --- |
| Rules | `src/lib/releases.ts`: statuses, what can change in each, publish checks. Pure, tested with Vitest |
| Database | `Release`, `ReleaseAllocation`; `ReleaseHold`, `ReleaseCustomerTally`, `WaitlistEntry`, `ReleaseEmail` exist for the later parts |
| Admin API | `/api/v1/admin/releases` (list, create), `[id]` (read, update, delete), `[id]/state`, `[id]/allocations` |
| Admin | Sales → **Releases** (`/admin/releases`, `/admin/releases/[id]`) |
| Dashboard | The Live Release card ([ADMIN-PANEL.md](ADMIN-PANEL.md)) |

---

## 2. Data model

**Release**: `title`, `edition`, `description`, `slug` (set once from the title
plus a random suffix), `startsAt` (opening), `endsAt`, `publishedAt` (null means
Draft), `hidden`, `maxPerCustomer` (at least 1), `reminderOffsetsMinutes`
(saved as 48 hours and 1 hour on create; used by #118), `completedAt` (set by
#119 when unsold units go back to stock).

**ReleaseAllocation**, one row per release and variant: `allocated`,
`available`, `reserved`, `sold`, `returned`. A database CHECK keeps
`allocated = available + reserved + sold + returned` with every counter at 0 or
more, so no code path can lose a unit. Only `available` moves in this part;
`reserved` and `sold` move with the checkout holds (#119).

The database also enforces: `maxPerCustomer >= 1`, `endsAt > startsAt` when
set, every reminder offset above 0.

**Legacy columns.** `releases.productId` and `releases.active` are from the
first, one product version. They stay for now so the code running during a
deploy keeps working: new code writes `active = !hidden` and leaves `productId`
empty, and reads neither. A later migration (`release_drops_contract`) drops
both and makes `slug` required, once production runs this code. Back up the
database before that one.

---

## 3. Status

Worked out on read by `releaseStatus(release, totalAvailable, now)`, in this
order:

1. No `publishedAt`: **Draft**.
2. `completedAt` set, or `endsAt` passed: **Completed**.
3. Before `startsAt`: **Upcoming**.
4. No `available` units left: **Sold out**. It returns to Live when units come
   back (a hold lapses or an order is cancelled, #119).
5. Otherwise: **Live**.

`hidden` is a separate flag shown as its own badge. The list's status filter
uses the same rules as database conditions.

---

## 4. What can change in each status

`allowedEdits(status)`:

| Status | Text | Hidden | Limit | Opening | End | Allocations |
| --- | --- | --- | --- | --- | --- | --- |
| Draft | yes | yes | yes | yes | yes | yes |
| Upcoming | yes | yes | yes | yes | yes | yes |
| Live, Sold out | yes | yes | yes | no | yes, not in the past | up, or down by unsold units |
| Completed | yes | yes | no | no | no | no |

A locked field sent with a new value answers 422 with the field named.

---

## 5. Actions

`PATCH /api/v1/admin/releases/[id]/state` with `{ action }`:

1. **Publish** (Draft only). Needs at least one allocated unit, an end time
   after the opening and not already past, and a limit of 1 or more. A future
   opening makes it Upcoming, a past one Live at once.
2. **Unpublish** (Upcoming only) returns it to Draft.
3. **End release** (Upcoming, Live, Sold out) sets the end to now. An opening
   still in the future moves to just before now, so the end stays after it.
   Unsold units stay in the allocation until #119 returns them to stock.

**Delete** (Draft or Upcoming, and only with no orders) returns every unsold
allocated unit to its variant's stock in the same transaction, then removes
the release.

---

## 6. Allocations

Allocating sets units aside from the variant's stock: the shop keeps selling
whatever is left, and the release sells only its own units.

`PUT /api/v1/admin/releases/[id]/allocations` takes the full list
`{ allocations: [{ variantId, allocated }] }`; a row left out is removed. In
one transaction (`setAllocations`):

1. The release row is locked first (completed releases refuse every change).
2. Raising a row takes the difference from `ProductVariant.stock`, only if
   that much is in stock.
3. Lowering a row gives unsold units back to stock, never more than
   `available`.
4. Removing a row is allowed only when nothing is reserved, sold or returned;
   its unsold units go back to stock.
5. Only variants of products that are not archived or in Trash can be added.

Rows are always changed in the same order (variants by id, then allocations by
release and variant), so two saves at once queue instead of deadlocking.
Problems answer 409 with a message per row, keyed by variant id, and nothing
is saved.

**Products.** Removing a variant, or deleting its product for good from Trash,
first runs `dropVariantAllocations` (`src/services/release-allocation.service.ts`)
in the same transaction. It deletes the variant's allocations when every one
of them can go (`canDropAllocation` in `src/lib/releases.ts`):

1. nothing is reserved, sold or returned, and
2. the row has no units (like the zero unit rows the backfill made), or its
   release is Completed.

If any row must stay, nothing is deleted and the save answers 409 until the
variant is taken out of the release. A row that changes in between answers
409 too. Deleting a product for good also clears the old `releases.productId`
link first, so no release is deleted with it.

---

## 7. API

All routes need `PERMISSIONS.releases` and record every change in the Change
Log.

| Route | Needs | Purpose |
| --- | --- | --- |
| `GET /api/v1/admin/releases` | View | Page of releases. Query `page`, `pageSize`, `search` (title or edition), `status`, `sort` (`opens_desc`, `opens_asc`). Each row has its product count, allocated, sold and remaining |
| `POST /api/v1/admin/releases` | Create | New Draft |
| `GET /api/v1/admin/releases/[id]` | View | The release with its allocations, each with the variant, product and current stock |
| `PUT /api/v1/admin/releases/[id]` | Edit | Update, within section 4 |
| `DELETE /api/v1/admin/releases/[id]` | Delete | Section 5 |
| `PATCH /api/v1/admin/releases/[id]/state` | Edit | `{ action: "PUBLISH" \| "UNPUBLISH" \| "END" }` |
| `PUT /api/v1/admin/releases/[id]/allocations` | Edit | Section 6 |

Hooks: `src/hooks/use-release.ts`. Validators:
`src/validators/release.validator.ts`.

---

## 8. Screens

1. **`/admin/releases`** lists releases with name and edition, opening (Dubai
   time), products, allocated, sold, remaining, status and a Hidden badge.
   Search, a status filter and sort by opening date. New release opens the
   create form, which lands on the release's page.
2. **`/admin/releases/[id]`** has the details form (fields lock per section
   4), the allocations table (in stock, allocated, reserved, sold, returned,
   remaining) with Add product, and the Publish, Unpublish, End release and
   Delete buttons, each shown only when allowed.

---

## 9. Limits and constants

In `src/lib/constants.ts`: `RELEASE_TITLE_MAX_LENGTH`,
`RELEASE_EDITION_MAX_LENGTH`, `RELEASE_DESCRIPTION_MAX_LENGTH`,
`RELEASE_MAX_PER_CUSTOMER_DEFAULT`, `RELEASE_MAX_PER_CUSTOMER_LIMIT`,
`RELEASE_ALLOCATIONS_MAX` (variants per release), `RELEASE_SLUG_SUFFIX_BYTES`,
`RELEASE_REMINDER_DEFAULTS_MINUTES`, `RELEASE_EARLY_END_OPENING_SHIFT_MS`.

---

## 10. Migrations

1. `20261103095019_release_drops_expand` (schema only): the new tables and
   columns, every CHECK above; `productId` becomes optional.
2. `20261103095020_release_drops_backfill` (data only): existing releases get
   a slug, `hidden = NOT active`, the default reminders, and zero unit
   allocations for their old product's variants. They stay Draft; no stock
   moves.

Both only add, so the previous app version keeps working while they apply.

---

## 11. Known limits

1. Unsold units of an ended release stay in its allocation until #119 adds the
   job that returns them to stock.
2. `reserved` and `sold` stay 0 until #119.
3. A release's slug never changes after create.
