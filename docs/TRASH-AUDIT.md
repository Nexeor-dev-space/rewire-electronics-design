# Change Log and Trash

Two linked admin features: the change log, which records who changed what in
the console with the values before and after, and Trash, which holds deleted
products and accounts so they can be restored.

Read this before adding an admin route that changes data, deleting anything
in a new module, or querying products.

---

## 1. What exists

1. Every admin write records an entry: who (name and role at the time), what
   (action, module, record), the previous and new values, and when.
2. Governance → **Change Log** (`/admin/change-log`) lists entries newest
   first, filters by module and action, searches by record or person, and
   opens a row to show each changed field before and after.
3. Deleting a **product** is now soft. It goes to Trash and can be restored
   or deleted permanently.
4. Deleted **accounts** (already soft, `state: INACTIVE`) are listed in Trash
   and can be restored.
5. Restore and delete permanently are permissions of their own on the Trash
   module, and both are recorded in the change log.

Other modules (categories, brands, add-ons, coupons, homepage sections) still
delete for good. Their last values stay readable in the change log entry.

Orders don't exist yet. When they do, an order status change is one
`recordAudit` call in its route (section 4).

---

## 2. Files

| File | Purpose |
| --- | --- |
| `prisma/schema/audit.prisma` | `AuditLog` |
| `prisma/schema/catalogue.prisma` | `Product.deletedAt` |
| `prisma/schema/user.prisma` | `PermissionAction.RESTORE` |
| `src/lib/audit.ts` | `AUDIT_ACTIONS`, labels, `auditSnapshot`, `auditDiff`, `auditFieldLabel`, `auditModuleLabel` (client safe) |
| `src/services/audit.service.ts` | `recordAudit`, `listAuditLogs` |
| `src/services/product.service.ts` | Soft `deleteProduct`, `listDeletedProducts`, `restoreProduct`, `purgeProduct`, `getProduct(id, { inTrash })` |
| `src/services/user.service.ts` | `listDeletedUsers`, `restoreUser`, `getUser(id, { inTrash })` |
| `src/services/homepage.service.ts` | `findDraftSection` (the previous value of a section) |
| `src/validators/audit.validator.ts`, `trash.validator.ts` | Query schemas |
| `src/types/audit.ts`, `trash.ts` | `AuditLogEntry`, `AuditFilters`, `TrashProduct`, `TrashFilters` |
| `src/app/api/v1/admin/audit-logs/route.ts` | The change log API |
| `src/app/api/v1/admin/trash/` | The Trash API |
| `src/hooks/use-audit-log.ts`, `use-trash.ts` | Queries and mutations |
| `src/app/admin/change-log/`, `src/app/admin/trash/` | Pages |
| `src/components/admin/change-log/`, `src/components/admin/trash/` | Screens |

---

## 3. Data model

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  actorId     String?  // User, SetNull when the user is removed
  actorName   String   // snapshot
  actorRole   UserRole // snapshot
  action      String   // one of AUDIT_ACTIONS
  module      String   // a permission module key, e.g. catalogue.products
  recordId    String?
  recordLabel String   // "iPhone 15 Pro", "Dubai", "Staff role"
  before      Json?
  after       Json?
  createdAt   DateTime @default(now())
  @@index([createdAt]) @@index([module, createdAt]) @@index([actorId, createdAt]) @@index([recordId])
  @@map("audit_logs")
}

model Product { … deletedAt DateTime? … @@index([deletedAt]) }

enum PermissionAction { VIEW CREATE EDIT DELETE PUBLISH RESTORE }
```

1. `action` and `module` are strings checked in code, so a new action or
   module needs no migration.
2. The actor's name and role are copied onto the entry, so it still reads
   right after the person is renamed, changes role or is deleted.
3. Entries are kept forever and are never edited or deleted from the
   console. Updates store only the fields that changed, so rows stay small.

Migration: one, adding `audit_logs`, `products.deletedAt` and the `RESTORE`
value (run by the developer with `npm run db:migrate -- --name add_audit_log_and_trash`).

---

## 4. Recording a change

`recordAudit(actor, entry)` in `src/services/audit.service.ts`. Routes call it
after the service call succeeds:

```ts
const before = await getCoupon(id);
const result = await updateCoupon(id, input.data);
await recordAudit(auth.session.user, {
  action: "UPDATE",
  module: PERMISSIONS.coupons,
  recordId: id,
  recordLabel: result.code,
  before,
  after: result,
});
return apiSuccess(result);
```

| Action | Before | After |
| --- | --- | --- |
| `CREATE` | none | the whole new record |
| `UPDATE` | changed fields only | changed fields only |
| `DELETE`, `PURGE` | the whole record | none |
| `RESTORE`, `PUBLISH`, `DISCARD` | as given (usually none) | as given |

Rules:

1. **Only changes.** For `UPDATE`, `auditDiff` keeps the top level fields that
   differ. Arrays and objects compare whole, so one edited variant records
   the whole variants list both ways. A save that changed nothing writes no
   entry.
2. **No secrets.** `auditSnapshot` drops `password`, `passwordHash`,
   `createdAt` and `updatedAt`. API Credentials entries record only
   `{ SMTP_PASS: "Set" }`, never a value. Never pass a secret in.
3. **Never fails the request.** A failed insert is logged to the server
   console and the change stands. The log is written after the change, not in
   its transaction: a crash between the two loses the entry, not the change.
4. **The previous value** comes from the module's existing getter
   (`getProduct`, `getCategory`, `getCoupon`, `findDraftSection`, …), which is
   one extra read per admin write.

What is recorded today:

| Module | Actions |
| --- | --- |
| Products | create, update (variant stock included), status change, delete (to Trash), restore, delete permanently |
| Categories | create, update, status change, delete |
| Brands, Add-ons, Discount Codes | create, update, delete |
| Delivery Zones | update |
| Homepage Builder | add, edit (including show or hide), delete, reorder, publish, discard |
| Content & Policies | save (title, text, published, draft notice, blocks) |
| Customers, Staff accounts | create, update (including a Staff role change), delete, restore; logged under the account's module |
| Roles | create, update, delete a Staff role |
| API Credentials | credential set or removed (no values), mode change |

Older stock changes were recorded under the removed Inventory module
(`catalogue.inventory`). `RETIRED_MODULE_LABELS` in `src/lib/audit.ts` keeps
their "Inventory" label; the module filter no longer lists it.

---

## 5. Trash

### Products

1. **Delete** (`DELETE /admin/products/[id]`, Products Delete) sets
   `deletedAt` and the status to Draft. Variants, images and specs stay.
2. **Hidden everywhere.** Admin product queries filter `deletedAt: null`
   (`LIVE` in `product.service.ts`, coupon targets), and the
   storefront's `PUBLISHED` filter includes it. Because a deleted product is
   also a Draft, the storefront could not show it even if a query missed the
   filter.
3. **Slug and SKUs stay taken** until the product is deleted permanently. The
   409 for a clash says the owner is in Trash.
4. **Restore** clears `deletedAt` and keeps the product a **Draft**, so it never
   goes live by surprise. It reappears in Products and the pickers.
5. **Delete permanently** is the old hard delete: variants, images and specs
   are removed and unused images released.
6. Brands and categories still count products in Trash when refusing a
   delete, because the rows still reference them.

### Users

1. Delete is unchanged: `state: INACTIVE`.
2. **Restore** sets `ACTIVE` and increments `sessionVersion`, so cookies from
   before the delete stay dead and the person signs in again.
3. Restoring a customer needs Trash Restore and Customers Edit. Restoring an
   Admin or Staff account also needs Staff accounts, which only Admins hold
   (`accountModule`), so in practice only Admins restore console accounts.
   The screen hides Restore on rows the viewer can't restore.
4. Accounts are not deleted permanently from Trash. Their email stays taken.

---

## 6. Permissions

| Module | Key | Actions |
| --- | --- | --- |
| Change Log | `governance.change-log` | View |
| Trash | `governance.trash` | View, Restore, Delete (delete permanently) |

Both can be granted to Staff on the Roles screen ([PERMISSIONS.md](PERMISSIONS.md)).
Restore is the new `RESTORE` action and exists only on Trash.

---

## 7. API

All paths are in `API_ENDPOINTS.admin.auditLogs` and `API_ENDPOINTS.admin.trash`.

| Route | Permission | Success | Errors |
| --- | --- | --- | --- |
| `GET audit-logs?page&pageSize&module&action&search` | Change Log View | 200 `Paginated<AuditLogEntry>` | 401, 403, 422 |
| `GET trash/products?page&pageSize&search` | Trash View | 200 `Paginated<TrashProduct>` | 401, 403, 422 |
| `GET trash/products/[id]` | Trash View | 200 `ProductDetail` | 401, 403, 404 |
| `POST trash/products/[id]/restore` | Trash Restore | 200 `ProductDetail` (Draft) | 401, 403, 404 |
| `DELETE trash/products/[id]` | Trash Delete | 200 `{ id }` | 401, 403, 404 |
| `GET trash/users?page&pageSize&search` | Trash View | 200 `Paginated<UserListItem>` | 401, 403, 422 |
| `GET trash/users/[id]` | Trash View | 200 `UserDetail` | 401, 403, 404 |
| `POST trash/users/[id]/restore` | Trash Restore | 200 `UserDetail` | 401, 403 (Admin account), 404 |

`search` on the change log matches the record label or the person's name.
`module` must be a known module key and `action` one of `AUDIT_ACTIONS`.

Hooks: `useGetAuditLogs`; `useGetTrashProducts`, `useGetTrashProduct`,
`useGetTrashUsers`, `useGetTrashUser`, `useRestoreProduct`, `usePurgeProduct`,
`useRestoreUser`. Trash mutations invalidate `["trash"]`, `["products"]`,
`["users"]` and `["audit-logs"]`.

---

## 8. Screens

1. **Change Log.** Columns: when, who (with role), action, module, record. A
   search box and module and action selects; pagination. Clicking a row opens
   a dialog with each field's previous and new value.
2. **Trash → Products** (`/admin/trash/products`). Deleted products, newest
   first, with View (a detail dialog), Restore and Delete permanently, each
   behind a confirm. Buttons the role lacks are hidden.
3. **Trash → Users** (`/admin/trash/users`). Deleted accounts with View and
   Restore.
4. `/admin/trash` redirects to the products list.

---

## 9. Adding to it

1. **A new admin write:** read the record's previous value with the module's
   getter, run the change, then call `recordAudit` with the module key.
2. **Trash for another model:** add `deletedAt`, filter it in every query for
   that model, make delete set it, and add list, restore and purge routes on
   the Trash module like the product ones.
3. **Orders:** record status changes as `UPDATE` with
   `before: { status }`, `after: { status }`.

---

## 10. Known limits

1. **Not atomic.** The entry is written after the change, outside its
   transaction (section 4).
2. **Forever.** Entries are never pruned. If the table grows large, add a
   retention setting.
3. **Search scans.** The record and person search is a case insensitive
   `contains` over the filtered rows; filters and pagination keep it bounded.
4. **Whole arrays.** A change to one variant or block records the whole list.
