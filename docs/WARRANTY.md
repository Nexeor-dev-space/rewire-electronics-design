# Warranty and Claims

How the console tracks each device sold, its warranty dates and status, and the
warranty claims raised against it. Service → **Warranty & Claims**.

Read this before you change `src/lib/warranty.ts`,
`src/services/warranty.service.ts`, a warranty or claim API route, or the
screens in `src/components/admin/warranty/`. [ORDERS.md](ORDERS.md) covers how
serials are entered in Fulfilment and how delivery starts the warranty;
[PERMISSIONS.md](PERMISSIONS.md) covers access levels.

---

## 1. What changed and why

1. **Device Registry was folded in.** The Catalogue → Device Registry row
   (`/admin/devices`, a placeholder) was removed. Devices, their warranties and
   their claims now live in one module under Service.
2. **One device per unit sold.** A line bought with quantity 4 has four
   `Device` rows, each with its own serial or IMEI, and shows as four rows in
   the warranty table. Devices are created with the order line at checkout.
   The old comma separated `OrderItem.serialNumber` was dropped; orders placed
   before devices existed were not carried over.
3. **The warranty dates stay on the order line.** The units on a line are
   delivered together, so they share `warrantyStartsAt` and `warrantyEndsAt`.
4. **Claims are new.** Two tables hold them: `WarrantyClaim` and
   `WarrantyClaimEvent`. A claim belongs to one device.
5. **The warranty status is never stored.** It is worked out from the dates
   on every read, so it turns Expired on its own, with no background job, and
   nobody can set it by hand.

---

## 2. Data model

`prisma/schema/warranty.prisma`. Migrations `add_warranty` (the claim tables)
and the follow up that adds `devices` and moves claims onto them (run by the
developer with `npm run db:migrate`).

1. **`Device`** (`devices`): `orderItemId` (cascade with the line),
   `unitNumber` (1 up to the line's quantity), `serialNumber` (nullable).
   Unique on `[orderItemId, unitNumber]`. Created at checkout by
   `orderItems` in `checkout.service.ts`, one per unit (`unitNumbers`).
2. **`WarrantyClaim`** (`warranty_claims`): `number` (unique, `WC-` plus 8
   digits), `deviceId` (`onDelete: Restrict`, so a device with claims, and its
   order, can never be deleted), `serialNumber` (the device's serial when the
   claim was raised, kept if it is corrected later), `status` (default
   `RAISED`), `issue`. Indexes on `[deviceId, status]` and
   `[status, createdAt]`.
3. **`WarrantyClaimEvent`** (`warranty_claim_events`): `claimId` (cascade),
   `status`, `note` (default empty, staff only), `actorId` (nullable,
   `SetNull`). Index on `[claimId, createdAt]`.
4. **Enum `WarrantyClaimStatus`**, mirrored by `WARRANTY_CLAIM_STATUSES` in
   `src/lib/warranty.ts`.
5. **Back relations:** `OrderItem.devices`, `User.warrantyEvents`.

The warranty dates stay on `OrderItem`: `warrantyMonths`, `warrantyStartsAt`,
`warrantyEndsAt`, plus `OrderItemAddOn.extraWarrantyMonths` for extended cover
([ORDERS.md](ORDERS.md) §2 and §3).

Orders placed before devices existed have no `Device` rows, so they don't
appear in the warranty table and show no serial fields in Fulfilment. This
was accepted: only new orders are tracked.

---

## 3. Which devices are warranty records

Devices on orders that are `CONFIRMED`, `PROCESSING`, `DISPATCHED` or
`DELIVERED` (`WARRANTY_ORDER_STATUSES`). Unpaid and cancelled orders are left
out. A device outside these answers 404 on every warranty route.

---

## 4. Warranty status

`warrantyStatus(dates, now)` in `src/lib/warranty.ts`:

| Status | When |
| --- | --- |
| Pending | No start date yet (the order isn't delivered), or the start is in the future |
| Active | From the start up to, not including, the end |
| Expired | From the end date on |

1. **Coverage starts on the delivery date.** Moving an order to Delivered sets
   `warrantyStartsAt` to that moment and `warrantyEndsAt` to the start plus
   `lineWarrantyMonths(line)`: the product's months (12 by default) plus any
   extended cover add-ons ([ORDERS.md](ORDERS.md) §3).
2. **The list filter** turns the same rules into a query (`statusWhere` in the
   service), so the filter and the badge always agree.
3. **Claim in progress** is shown as its own badge beside the warranty status,
   never instead of it. It means the device has a claim that is not Returned
   to customer or Declined.

---

## 5. Claims

### Lifecycle

`WARRANTY_CLAIM_TRANSITIONS` in `src/lib/warranty.ts`:

| From | To |
| --- | --- |
| Claim raised (`RAISED`) | Serial verification, Declined |
| Serial verification | Collection, Declined |
| Collection | Assessment |
| Assessment | Repair, Replacement, Declined |
| Repair | Returned to customer |
| Replacement | Returned to customer |
| Returned to customer, Declined | final |

1. **Declined** is not in the PRD list. It was added so a claim that fails
   serial verification or assessment can be closed.
2. **Open and closed:** `CLOSED_WARRANTY_CLAIM_STATUSES` are Returned to
   customer and Declined; every other status is open
   (`OPEN_WARRANTY_CLAIM_STATUSES`).
3. **Every change writes a `WarrantyClaimEvent`** with the staff member and an
   optional note. Raising writes the first, `RAISED`, event.
4. The status button labels come from `claimActionLabel`: "Move to
   assessment", "Decline claim".

### Eligibility (checked when a claim is raised)

`createClaim` runs in one transaction and locks the device first, so two
claims raised at once for it can't both pass.

1. The warranty must be **Active** at that moment, otherwise 409 "A claim can
   only be raised while the warranty is active."
2. The device must have a **serial recorded**, otherwise 409 "Record the
   device's serial or IMEI before raising a claim." The claim copies it.
3. The device must have **no open claim**, otherwise 409 "This device already
   has an open claim."

A claim already raised keeps moving through its steps after the warranty
expires; eligibility is a check at raise time only.

---

## 6. Editing a warranty

`updateWarranty` lets staff correct two things:

| Field | Rules |
| --- | --- |
| `serialNumber` | This device's serial. Trimmed, up to `SERIAL_NUMBER_MAX_LENGTH` (120). Empty clears it |
| `warrantyStartsAt` | Only once the warranty has started (409 "The warranty starts when the order is delivered." otherwise). Not before the order was placed and not in the future (422, `checkWarrantyStart`). Saved on the order line, so it moves for every unit on that line |

1. The end date is always recalculated from the new start and the line's
   cover. It is never sent by the client.
2. The status follows from the dates, so it can't be set.
3. Product, order and customer are shown but never changed.
4. Serials can be corrected after delivery from here; before delivery they
   are entered in Fulfilment, one field per device.
5. Open claims keep the serial they were raised with, even if the line's
   serial is corrected later.

---

## 7. API

Every route returns through `apiSuccess` / `apiError`. Paths are in
`API_ENDPOINTS.admin.warranties` and `API_ENDPOINTS.admin.warrantyClaims`.
Validators are in `src/validators/warranty.validator.ts`. A malformed claim
number answers 404.

| Route | Auth | Body or query | Success | Errors |
| --- | --- | --- | --- | --- |
| `GET admin/warranties` | `service.warranty` View | `page`, `pageSize`, `search`, `status` (`PENDING`, `ACTIVE`, `EXPIRED`) | 200 `Paginated<AdminWarrantyRow>`, newest line first | 403, 422 |
| `GET admin/warranties/[id]` | View | | 200 `AdminWarrantyDetail` | 403, 404 |
| `PATCH admin/warranties/[id]` | Edit | `{ serialNumber?, warrantyStartsAt? }` (ISO), at least one | 200 `AdminWarrantyDetail` | 403, 404, 409, 422 |
| `POST admin/warranties/[id]/claims` | Edit | `{ issue }` | 201 `AdminWarrantyClaimDetail` | 403, 404, 409, 422 |
| `GET admin/warranty-claims/[number]` | View | | 200 `AdminWarrantyClaimDetail` | 403, 404 |
| `PATCH admin/warranty-claims/[number]/status` | Edit | `{ status, note? }`; `status` is any status but `RAISED` | 200 `AdminWarrantyClaimDetail` | 403, 404, 409, 422 |

`[id]` is the device's id.

**Search** matches the serial, product name, order number, order email, first
name or last name, case insensitive.

**Responses** (`src/types/warranty.ts`):

1. **`AdminWarrantyRow`:** `id`, `serialNumber`, `unitNumber`, `quantity`,
   `productName`, `variantLabel`, `customerName`, `email`, `orderNumber`,
   `warrantyStartsAt`, `warrantyEndsAt`, `status`, `claimInProgress`.
2. **`AdminWarrantyDetail`:** the device (`serialNumber`, `unitNumber`,
   `quantity`, `productName`, `brand`, `sku`, `variantLabel`, image), the
   warranty (`status`, dates, `baseMonths`, `totalMonths`, `coverAddOns`),
   `order` (`number`, `status`, `placedAt`, `dispatchedAt`, `deliveredAt`),
   `contact`, `customer` or null, `claims` (newest first, up to
   `WARRANTY_CLAIMS_LIMIT`), `claimInProgress` and `canRaiseClaim`.
3. **`AdminWarrantyClaimDetail`:** `number`, `status`, `serialNumber`, `issue`,
   `raisedAt`, `nextStatuses`, `events` (oldest first, up to
   `ORDER_EVENT_LIMIT`), `device` (`id`, `unitNumber`, `quantity`,
   `productName`, `variantLabel`, `warrantyStatus`, `warrantyEndsAt`),
   `orderNumber`, `customerName`, `email`.

`unitLabel(unitNumber, quantity)` gives "Unit 2 of 4", or nothing when the
line holds one unit.

`dispatchedAt` is the first Dispatched entry in the order history.

**Audit.** Editing a warranty records `UPDATE` with the serial and dates.
Raising a claim records `CREATE` with status, serial and issue. A claim status
change records `UPDATE` with the status. All under module `service.warranty`
([TRASH-AUDIT.md](TRASH-AUDIT.md)).

---

## 8. Hooks

`src/hooks/use-warranty.ts`. `warrantyKeys.all` is `["warranties"]`.

| Hook | Notes |
| --- | --- |
| `useGetWarranties(filters)` | Keeps the previous page while the next loads |
| `useGetWarranty(id)` | |
| `useUpdateWarranty()` | Invalidates `warrantyKeys.all` and `orderKeys.all`, since order screens show the serial and dates |
| `useCreateClaim()` | Invalidates `warrantyKeys.all` |
| `useGetClaim(number)` | |
| `useChangeClaimStatus()` | Invalidates `warrantyKeys.all` |

---

## 9. Screens

Every page checks `PERMISSIONS.warranty` and shows "Access denied" otherwise.
`/admin/service/warranty` and `/admin/service/claims` are in `BUILT_ROUTES`.

1. **Table** (`/admin/service/warranty`, `warranty-management.tsx`): one row
   per device, with "Unit n of m" under the serial when the line holds
   several. Search, a warranty status filter, a table (Serial / IMEI, Product and variant,
   Customer, Order, Starts, Expires, Status with the Claim in progress badge,
   Actions) and pagination at `ADMIN_PAGE_SIZE`. View opens the preview; Edit
   shows only with Edit. Loading, error and empty states as on Returns.
2. **Preview** (`/admin/service/warranty/[id]`, `warranty-detail.tsx`):
   Device, Warranty (status, dates, standard cover, each cover add-on, total,
   link to the warranty policy), Claims (each links to its page, or a hint
   saying why none can be raised), Order (placed, dispatched, delivered) and
   Customer. Read only. Edit and Raise claim buttons in the header need Edit;
   Raise claim shows only while `canRaiseClaim`.
3. **Edit** (`/admin/service/warranty/[id]/edit`, `warranty-edit.tsx`): the
   page itself needs Edit. Serial / IMEI, Warranty start (a store clock
   `datetime-local`, locked until delivery), a live Expires preview, the linked
   product, order and customer read only, Save and Cancel. Only changed fields
   are sent. "Warranty saved." or the error shows beside Save.
4. **Raise claim dialog** (`raise-claim-dialog.tsx`): the Fault only; the
   claim is for this device and its serial. On success it opens the new claim.
5. **Claim** (`/admin/service/claims/[number]`, `claim-detail.tsx`): Fault,
   History, Update status (a button per `nextStatuses` with a staff note) and
   Device. `/admin/service/claims` redirects to the table.

`Section` and `DetailRow` moved from the Returns detail into
`src/components/admin/shared/detail-section.tsx` and are shared by both
modules.

---

## 10. Constants

In `src/lib/constants.ts`.

| Constant | Value | Used by |
| --- | --- | --- |
| `WARRANTY_CLAIM_NUMBER_PREFIX` | `WC-` | Claim numbers, `claimNumberValidator` |
| `WARRANTY_CLAIM_ISSUE_MIN_LENGTH` | 4 | Fault description |
| `WARRANTY_CLAIM_ISSUE_MAX_LENGTH` | 1000 | Fault description |
| `WARRANTY_CLAIMS_LIMIT` | 50 | Claims listed on the preview |
| `ADMIN_WARRANTY_PATH` | `/admin/service/warranty` | Links, redirect |
| `ADMIN_WARRANTY_CLAIMS_PATH` | `/admin/service/claims` | Claim links |

No environment variable and no dependency was added.

---

## 11. Permissions

One module in the Service area: **`service.warranty`** (`PERMISSIONS.warranty`,
"Warranty & Claims"), View and Edit. View covers the table, the preview, the
claim page and the sidebar row. Edit covers the Edit page, raising claims and
changing claim status. Existing Staff roles have No access until an Admin sets
a level on Governance → Roles. Admin always has it.

---

## 12. Tests

No test files are committed for this module. The Fulfilment serial schema
(`deviceId`, `serialNumber`) is covered in
`src/validators/order.validator.test.ts`. The transactions (`createClaim`,
`changeClaimStatus`, `updateWarranty`, `updateFulfilment`) were not run
against a database.

---

## 13. Known limits and follow ups

1. **Customers can't raise or see claims yet.** Claims are staff only.
2. **The dashboard's Open Warranty Claims figure** is still a placeholder.
3. **A replacement doesn't swap the serial.** After a Replacement, correct the
   serial on the Edit page by hand.
4. **Serials aren't checked for uniqueness** across devices.
5. **The status filter has no index** on the warranty dates. Fine at current
   volumes; add one to `order_items` if the table grows large.
6. **Search by full name** matches first or last name, not "first last"
   together.
7. **Orders placed before devices existed aren't tracked.** They have no
   devices, so they stay off the warranty table.
