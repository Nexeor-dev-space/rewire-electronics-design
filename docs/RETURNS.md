# Returns, Refunds and the Return Window

How a customer asks to return part of a delivered order, how staff move the
return through approval, receipt and inspection, how a refund is recorded by
hand, and how the return window is set. Built in Phase 7.

Read this before you change `src/lib/returns.ts`,
`src/services/return.service.ts`, `src/services/store-settings.service.ts`, a
return or store settings API route, the admin Returns screens, the account
Returns screen, the return links on order detail, or the product page returns
item. [ORDERS.md](ORDERS.md) covers orders and payment status,
[PERMISSIONS.md](PERMISSIONS.md) covers access levels. This document covers
what is specific to returns.

There is no payment gateway and no refund API. Staff pay the refund outside
the system and then record it here.

---

## 1. What this module covers

| Area | What exists |
| --- | --- |
| Rules | `src/lib/returns.ts`: pure, client safe, tested with Vitest |
| Database | `ReturnRequest`, `ReturnItem`, `ReturnStatusEvent`, `StoreSettings` |
| Customer API | `/api/v1/account/returns` (list, create) and `account/returns/eligible` |
| Admin API | `/api/v1/admin/returns` (list, detail, status, refund) and `admin/store-settings` |
| Admin | Service → **Returns** (`/admin/returns`, `/admin/returns/[number]`) with the Return window dialog |
| Storefront | `/account/returns`, return links on the account order detail, a Track Order notice for guests, the product page returns item |

---

## 2. Data model

`prisma/schema/return.prisma` and `StoreSettings` in
`prisma/schema/settings.prisma`. Migration `add_returns`
(`prisma/migrations/20261007114348_add_returns`). Every model has `createdAt`
and `updatedAt`. Money is an `Int` in fils.

1. **`ReturnRequest`** (`return_requests`): `number` (unique, `RT-` plus 8
   digits), `orderId` (`onDelete: Restrict`), `status` (default `REQUESTED`),
   `reason`, `detail` (default empty), `refundAmount` (nullable),
   `refundReference` (default empty), `refundedAt` (nullable). Indexes on
   `orderId`, `[status, createdAt]` and `createdAt`. There is no `userId`:
   ownership is `order.userId`, so a return follows its order when a guest
   order is claimed.
2. **`ReturnItem`** (`return_items`): `returnRequestId` (cascade),
   `orderItemId` (`Restrict`), `quantity`. Unique on
   `[returnRequestId, orderItemId]`.
3. **`ReturnStatusEvent`** (`return_status_events`): `returnRequestId`
   (cascade), `status`, `note` (shown to the customer), `actorId` (nullable,
   `SetNull`; null means the customer). Index on `[returnRequestId, createdAt]`.
4. **`StoreSettings`** (`store_settings`): a singleton. `id` is an `Int`
   defaulting to 1, `returnWindowDays` (default 30), `updatedById` (nullable,
   `SetNull`). The service only upserts id 1. No row reads as the default
   `RETURN_WINDOW_DAYS`, the same way `IntegrationSettings` works.
5. **Enums:** `ReturnStatus` and `ReturnReason`, mirrored by `RETURN_STATUSES`
   and `RETURN_REASONS` in `src/lib/returns.ts`.
6. **Back relations:** `Order.returns`, `OrderItem.returnItems`,
   `User.returnEvents`, `User.storeSettingsUpdates`.

Why it is shaped this way:

1. The window is locked per order. `Order.returnableUntil` is set at delivery,
   so an admin edit applies to later deliveries only and no open window ever
   shrinks.
2. Refund fields sit on the request, not in a refund table. One refund per
   return is the simplest audit. A correction needs a new return or a note.
3. The returned quantity is computed, not stored: the sum over returns that
   are not Declined, in one grouped query (`returnedQuantities`). It cannot
   drift.
4. `Restrict` to the order and the order item: an order with returns can never
   be deleted.
5. Nothing is backfilled. All four tables are new.

---

## 3. Eligibility

`isReturnable(order, now)` in `src/lib/returns.ts` is true when the order is
`DELIVERED`, `returnableUntil` is set, and `now` is strictly before it. It
accepts a `Date` or an ISO string for `returnableUntil`. At exactly
`returnableUntil` the window is closed. The setting is never read at request
time; only the stored `returnableUntil` counts.

1. **Per line:** `returnableQuantity(bought, returned)` is
   `max(0, bought - returned)`, where `returned` sums the line over every
   return that is not `DECLINED`. A return held in any other status, including
   `REFUNDED`, keeps its quantity. A Declined return frees it.
2. **`checkReturnItems(lines, requested)`** returns field errors or null. An
   item not on the order or listed twice is reported on
   `items.{i}.orderItemId` ("That item isn't on this order.", "That item is
   listed twice."). A quantity below 1 or above the returnable quantity is
   reported on `items.{i}.quantity`: "Only {n} can be returned." or, when
   nothing is left, "Nothing is left to return on this item."
3. **Reasons:** `RETURN_REASON_META` gives each reason a label, a note and
   `requiresDetail`. Detail is required for `NOT_AS_DESCRIBED`,
   `ARRIVED_DAMAGED` and `BATTERY_ISSUE`; `CHANGED_MIND` and `WRONG_ITEM` do
   not need it.
4. **COD:** a delivered cash on delivery order that is still unpaid can be
   returned. The refund is refused until staff mark the order paid.
5. **Guest orders** show in the account, and so can be returned, only after
   the shadow user is claimed ([ORDERS.md](ORDERS.md) §6).

---

## 4. Statuses and transitions

`RETURN_TRANSITIONS` in `src/lib/returns.ts`:

| From | To |
| --- | --- |
| `REQUESTED` | `APPROVED`, `DECLINED` |
| `APPROVED` | `IN_TRANSIT`, `RECEIVED`, `DECLINED` |
| `IN_TRANSIT` | `RECEIVED` |
| `RECEIVED` | `INSPECTING`, `DECLINED` |
| `INSPECTING` | `DECLINED` |
| `REFUNDED`, `DECLINED` | final |

1. **`REFUNDED` is reached only through the refund route**, from `RECEIVED` or
   `INSPECTING` (`canRefund(status)`, `REFUNDABLE_RETURN_STATUSES`).
   `nextReturnStatuses(status)` never lists it, and `returnStatusChangeSchema`
   refuses it.
2. **Active and closed:** `ACTIVE_RETURN_STATUSES` are `REQUESTED`,
   `APPROVED`, `IN_TRANSIT`, `RECEIVED`, `INSPECTING`.
   `CLOSED_RETURN_STATUSES` are `DECLINED` and `REFUNDED`. They drive the
   `state` filter and the Active and Previous sections.
3. **Labels and tone:** `RETURN_STATUS_LABELS` and `returnStatusTone`
   (Refunded live, Declined danger, In transit and Inspecting warn, the rest
   muted).
4. **Every change writes a `ReturnStatusEvent`.** The note is shown to the
   customer in the timeline. The creation event is `REQUESTED` with no actor.
5. **No automatic restock** when a return is `RECEIVED`. Staff adjust stock in
   Inventory after inspection.

---

## 5. Refunds

A refund is recorded by hand, once per return, by `recordRefund`. The staff
member has already paid the customer outside the system.

1. **When:** the return is `RECEIVED` or `INSPECTING`, otherwise 409 "Only
   received or inspected returns can be refunded."
2. **`refundableAmount(order)`:** `total - refundedAmount` while the order is
   `PAID` or `PARTIALLY_REFUNDED`, else 0. Never negative. An `UNPAID` order
   answers 409 "This order has no payment to refund. Mark it paid first."
   An order with nothing left (already fully refunded by earlier returns)
   answers 409 "This order is already fully refunded.", and the admin
   detail reports `canRefund: false` so the button is hidden.
3. **Amount:** at least 1 fil and at most the refundable amount, else 422 on
   `fields.amount`: "You can refund at most {amount}." Delivery can be
   refunded; the amount is not limited to the returned items.
4. **Effect on the order:** `refundedAmount` grows by the amount and
   `paymentStatus` becomes `paymentStatusAfterRefund(total, refundedAfter)`:
   `REFUNDED` when the refunded total equals the order total, otherwise
   `PARTIALLY_REFUNDED`. Refunds across several returns add up, and the sum
   can never pass `total`. `paymentActions` in `src/lib/orders.ts` is
   unchanged: these two statuses come only from `recordRefund`
   ([ORDERS.md](ORDERS.md) §4).
5. **Effect on the return:** `status` becomes `REFUNDED` and `refundAmount`,
   `refundReference` and `refundedAt` are stored. A `REFUNDED`
   `ReturnStatusEvent` carries the note.
6. **Staff audit on the order:** an `OrderStatusEvent` on the order's current
   status with the note "Refund of {amount} recorded for {RT number}". The
   customer timeline keeps the first event per status, so it does not change.
7. **Concurrency:** the whole of `recordRefund` is one transaction. The order
   update is guarded on `refundedAmount` and `paymentStatus`; if another
   refund landed first, 409 "Another refund was recorded on this order.
   Refresh and try again." The return update is guarded on its status; if it
   moved, 409 "This return changed. Refresh and try again."

**Suggested refund.** `suggestedRefund(order, items)` is
`round(sum((unitPrice + addOnUnitPrice) * quantity) * (subtotal - discount) /
subtotal)`, capped at `refundableAmount` and never negative. It is 0 when
`subtotal` is 0. Delivery is never in the suggestion; staff can type it in.
The share of the order discount keeps a discounted order from over refunding.
The refund dialog prefills the amount from it.

---

## 6. The return window setting

1. **Where:** `StoreSettings.returnWindowDays`, read through
   `getStoreSettings(db = prisma)` in `src/services/store-settings.service.ts`.
   `updateStoreSettings(actorId, input)` upserts id 1 and stores `updatedById`.
   With no row the value is `RETURN_WINDOW_DAYS` (30) and `updatedAt` is null.
2. **Range:** a whole number from 0 to `RETURN_WINDOW_MAX_DAYS` (365).
   `storeSettingsSchema` enforces it. 0 makes later deliveries not returnable.
3. **When it is read:** at delivery, in `applyStatusChange` in
   `order.service.ts`:
   `returnableUntil(now, (await getStoreSettings(tx)).returnWindowDays)`. The
   result is stored on the order. Orders delivered before a change keep their
   stored value; orders delivered before Phase 7 keep the 30 day value.
4. **Product page:** `src/app/(site)/product/[slug]/page.tsx` reads the
   setting on the server and passes `returnWindowDays` through `ProductStage`
   to `ProductBuyPanel`, which shows "{n}-day returns" in the trust row. At 0
   the returns item is hidden.
5. **Admin:** the "Return window: {n} days" button on the Returns list opens
   the Return window dialog (section 11).
6. **Gate:** the settings routes use `PERMISSIONS.returns` while the window is
   the only field. If a second setting is added, give the screen its own
   permission.

---

## 7. API

Every route returns through `apiSuccess` / `apiError`. Return numbers in a URL
are normalised by `returnNumberParamsSchema` (`/^RT-\d{8}$/`, uppercased); a
malformed number answers 404, not 422. Paths are in `API_ENDPOINTS`
(`account.returns`, `account.returnsEligible`, `admin.returns.{list,
detail(number), status(number), refund(number)}`, `admin.storeSettings`).
Validators are in `src/validators/return.validator.ts`.

Customer routes use `authorizeApi()`. Every order lookup and the returns list
filter the order by `accountOrdersWhere(session.user)`, so guest orders stay
hidden until the email is verified.

| Route | Auth | Success | Errors |
| --- | --- | --- | --- |
| `GET account/returns?page&state` | session | 200 `Paginated<CustomerReturn>`, `ACCOUNT_LIST_PAGE_SIZE` per page, newest first | 401, 422 |
| `POST account/returns` | session; `returnRequest` limit per user | 201 `CustomerReturn` | 401, 404, 409, 422, 429 |
| `GET account/returns/eligible?page` | session | 200 `Paginated<EligibleReturnOrder>`, newest delivered first | 401, 422 |
| `GET admin/returns` | `service.returns` View | 200 `Paginated<AdminReturnRow>`, newest first | 403, 422 |
| `GET admin/returns/[number]` | `service.returns` View | 200 `AdminReturnDetail` | 403, 404 |
| `PATCH admin/returns/[number]/status` | `service.returns` Edit | 200 `AdminReturnDetail` | 403, 404, 409, 422 |
| `POST admin/returns/[number]/refund` | `service.returns` Edit | 200 `AdminReturnDetail` | 403, 404, 409, 422 |
| `GET admin/store-settings` | `service.returns` View | 200 `StoreSettingsView` | 403 |
| `PUT admin/store-settings` | `service.returns` Edit | 200 `StoreSettingsView` | 403, 422 |

Request bodies and queries:

1. **`GET account/returns`:** `page` (default 1) and `state`, `active` or
   `closed`. No state lists both.
2. **`POST account/returns`:** `createReturnSchema`:
   `orderNumber`, `items` (1 to `CART_MAX_LINES` of `{ orderItemId, quantity }`,
   quantity 1 to `CART_MAX_LINE_QUANTITY`), `reason`, `detail` (trimmed, up to
   `RETURN_DETAIL_MAX_LENGTH`, default empty). A detail shorter than
   `RETURN_DETAIL_MIN_LENGTH` is refused on `detail` when the reason requires
   one; a repeated `orderItemId` is refused on `items`.
3. **`GET account/returns/eligible`:** `page`. Lists orders that are
   `DELIVERED` with `returnableUntil` in the future. A line with nothing left
   carries `returnableQuantity: 0`.
4. **`GET admin/returns`:** pagination, `search` (up to
   `SEARCH_QUERY_MAX_LENGTH`; matches return number, order number or order
   email, case insensitive) and `status`.
5. **`PATCH …/status`:** `{ status, note }`. `status` is any status but
   `REFUNDED`; `note` is up to `ORDER_NOTE_MAX_LENGTH`, default empty, and is
   shown to the customer.
6. **`POST …/refund`:** `{ amount, reference, note }`. `amount` is minor units,
   at least 1; `reference` is trimmed, 1 to `REFUND_REFERENCE_MAX_LENGTH`;
   `note` as above.
7. **`PUT admin/store-settings`:** `{ returnWindowDays }`.

Errors by route:

1. **`POST account/returns`:** 404 "We couldn't find that order." (missing or
   not owned); 409 "This order isn't eligible for returns." (not delivered, no
   window, or window closed); 422 "Please check the highlighted fields." with
   `fields.items.{i}.quantity`, `fields.items.{i}.orderItemId`,
   `fields.detail`; 429.
2. **`PATCH …/status`:** 404 "We couldn't find that return."; 409 "A return
   that is {from} can't move to {to}." (on `fields.status`) or "This return
   changed. Refresh and try again." when another change landed first.
3. **`POST …/refund`:** the 404, 409 and 422 messages in section 5.

**`createReturn`** runs in one transaction. It locks the order with
`tx.order.updateMany({ where: { number, ...accountOrdersWhere(user) }, data:
{ updatedAt: now } })`; a count of 0 is the 404. It checks `isReturnable`
against the stored `returnableUntil`, groups returned quantities per line,
runs `checkReturnItems`, then creates the request, its items and a `REQUESTED`
event with no actor. The number comes from
`generateReference(RETURN_NUMBER_PREFIX)`; the whole transaction retries up to
`REFERENCE_NUMBER_ATTEMPTS` times on a number collision, as checkout does.

**`changeReturnStatus`** checks the transition table, then runs a guarded
`updateMany where { id, status: from }` and writes the event, in one
transaction.

Response shapes are in `src/types/return.ts`:

1. **`ReturnLine`:** `orderItemId`, `productName`, `variantLabel`, `imageUrl`,
   `imageAlt`, `quantity`, `unitPrice`. `unitPrice` is the line's unit price
   without add-ons.
2. **`CustomerReturn`:** `number`, `orderNumber`, `status`, `reason`, `detail`,
   `requestedAt`, `refundAmount` or null, `refundedAt` or null, `items`,
   `timeline` (`{ status, label, note, at }`, oldest first, up to
   `ORDER_EVENT_LIMIT`).
3. **`EligibleReturnOrder`:** `orderNumber`, `deliveredAt`, `returnableUntil`,
   `lines` (`orderItemId`, `productName`, `variantLabel`, `imageUrl`,
   `imageAlt`, `quantity`, `returnableQuantity`).
4. **`AdminReturnRow`:** `number`, `orderNumber`, `customerName`, `email`,
   `status`, `reason`, `itemCount`, `requestedAt`, `refundAmount`.
5. **`AdminReturnDetail`:** a `CustomerReturn` plus `customer` (`{ id,
   fullName, email }` or null), `order` (`number`, `total`, `refundedAmount`,
   `paymentStatus`, `paymentMethod`, `refundable`), `suggestedRefund`,
   `refundReference`, `nextStatuses`, `canRefund`, and `events` (`{ status,
   note, actorName, at }`). The suggestion includes add-ons, so it can differ
   from the sum of the displayed `unitPrice` values.
6. **`StoreSettingsView`:** `returnWindowDays` and `updatedAt` (null when no
   row exists).

Orders carry return data too ([ORDERS.md](ORDERS.md) §9): each `OrderLine` has
`returnableQuantity`, and `AdminOrderDetail.returns` lists `{ number, status }`
for the order's returns, oldest first, capped at `ORDER_RETURNS_LIMIT` (50).

**Audit.** The status, refund and settings mutations call `recordAudit` with
action `UPDATE`, module `service.returns`, the return number as record id and
label (the settings use the label "Store settings"). Return audits record
status, refund amount and reference; settings audits record
`returnWindowDays`. Reads and customer requests are not audited. See
[TRASH-AUDIT.md](TRASH-AUDIT.md).

---

## 8. Hooks

`src/hooks/use-return.ts`. `returnKeys` holds `all` (`["returns"]`),
`accountList(filters)`, `eligible(page)`, `adminList(filters)` and
`adminDetail(number)`.

1. **`useGetAccountReturns(filters)`** and **`useGetReturnEligibleOrders(page)`**
   keep the previous page while the next loads.
2. **`useCreateReturn()`** invalidates `returnKeys.all` and `orderKeys.all`, so
   `returnableQuantity` on order detail refreshes.
3. **`useGetAdminReturns(filters)`**, **`useGetAdminReturn(number)`**.
4. **`useChangeReturnStatus()`** invalidates `returnKeys.all`.
5. **`useRecordRefund()`** invalidates `returnKeys.all` and `orderKeys.all`.

`src/hooks/use-store-settings.ts`: `storeSettingsKeys.all`,
`useGetStoreSettings()` and `useUpdateStoreSettings()`, which invalidates only
`storeSettingsKeys.all` because no stored window changes.

---

## 9. Admin screens

Service → **Returns**. Both pages check `PERMISSIONS.returns` with
`hasPermission` and show "Access denied" otherwise. `/admin/returns` is in
`BUILT_ROUTES` in `src/app/admin/[...slug]/page.tsx`.

1. **List** (`/admin/returns`, `return-management.tsx`): search box (return
   number, order number or email), a status filter, a table (return and order
   number, customer, reason, status, items, requested, refund) and
   pagination at `ADMIN_PAGE_SIZE`. Each row links to the detail. Empty states
   read "No returns yet" and "No returns match". The header shows the
   "Return window: {n} days" button, or plain text without Edit.
2. **Detail** (`/admin/returns/[number]`, `return-detail.tsx`): items returned,
   reason and the customer's detail, History (the staff events with actor),
   an Update status panel, the Order payment panel (method, payment status,
   order total, refunded so far, still refundable, and the refund on this
   return once set), and Customer ("No account is linked to this order." when
   there is none). The "Record refund" button shows with Edit while
   `canRefund`.
3. **Update status** (`StatusSection`): one button per `nextStatuses` entry
   ("Mark approved", "Mark declined" and so on) and a Note field marked
   "Visible to the customer." The note clears after a change. There is no
   confirm step before Declined.
4. **Record refund dialog** (`record-refund-dialog.tsx`): Amount, prefilled
   from `suggestedRefund` through `fromMinorUnits` and read back with
   `toMinorUnits`; Reference; Note ("Visible to the customer."). Field errors
   from the API show inline.
5. **Return window dialog** (`return-window-dialog.tsx`): one number field,
   "Days after delivery", with the hint "0 to 365 days." It loads the current
   value through `useGetStoreSettings`, validates with `storeSettingsSchema`
   and saves with `useUpdateStoreSettings`.

The Returns panel on the admin **order** detail page is not built yet. That
page lives on branch `feat/40-orders-admin`; add the panel after both
branches merge. The data is ready: `AdminOrderDetail.returns` links each
return number to `/admin/returns/[number]`.

---

## 10. Customer screens

1. **Account returns** (`/account/returns`, `account-returns.tsx`): Active
   (`state=active`) and Previous (`state=closed`, "Refunded or declined.")
   lists, paged with `AccountPagination`. A card shows the items, the reason
   label, the status pill, the refund amount and date once set, the detail,
   and a Timeline of steps with their notes. The Request a return panel lists
   eligible orders from `useGetReturnEligibleOrders`, only lines with
   `returnableQuantity > 0`, with a `QuantityStepper` when more than 1 is
   returnable, reasons from `RETURN_REASON_META`, and submits through
   `useCreateReturn`. Field errors show inline.
2. **Presets:** `?order=RW-…&item=<orderItemId>` selects that order and line
   (or every returnable line of the order when `item` is absent) and moves
   the request panel above the Active list. The preset only works when the
   order is on the loaded page of eligible orders.
3. **Order detail** (`/account/orders/[number]`): `OrderDetailBody` is given
   `returnLinks`. While the order is returnable the items header shows
   "Returnable until {date}" and, when a line has `returnableQuantity > 0`,
   "Request a return"; each such line shows "Return this item". A delivered
   order past its window shows "Return window closed". Details are in
   [ORDERS.md](ORDERS.md) §11 and [STOREFRONT-NAVIGATION.md](STOREFRONT-NAVIGATION.md).
4. **Track Order** shows no return links. On a returnable order it tells the
   guest to create an account with the order email (or reset its password if
   one exists) and verify it, then request the return from the account.
5. **Product page:** the trust row shows "{n}-day returns" from the stored
   setting, and hides the item at 0.

---

## 11. Constants and rate limits

In `src/lib/constants.ts`.

| Constant | Value | Used by |
| --- | --- | --- |
| `RETURN_NUMBER_PREFIX` | `RT-` | Return numbers, `returnNumberValidator` |
| `RETURN_DETAIL_MIN_LENGTH` | 4 | Detail required by a reason |
| `RETURN_DETAIL_MAX_LENGTH` | 1000 | Return detail |
| `REFUND_REFERENCE_MAX_LENGTH` | 100 | Refund reference |
| `RETURN_WINDOW_DAYS` | 30 | The default when no `StoreSettings` row exists, the cart summary and home benefits copy |
| `RETURN_WINDOW_MAX_DAYS` | 365 | Upper bound of the setting |
| `ORDER_RETURNS_LIMIT` | 50 | Returns listed on `AdminOrderDetail` |
| `ACCOUNT_RETURNS_PATH` | `/account/returns` | Order detail return links |
| `ADMIN_RETURNS_PATH` | `/admin/returns` | Admin links |
| `RATE_LIMITS.returnRequest` | 10 per hour, per user | `POST account/returns` |

`REFERENCE_NUMBER_DIGITS`, `REFERENCE_NUMBER_ATTEMPTS`,
`ACCOUNT_LIST_PAGE_SIZE`, `ORDER_NOTE_MAX_LENGTH`, `ORDER_EVENT_LIMIT` and
`MS_PER_DAY` come from [ORDERS.md](ORDERS.md) §12. Rate limits work as
described in [AUTH.md](AUTH.md) §7. No environment variable and no dependency
was added.

---

## 12. Permissions

One module in the Service area: **`service.returns`** (`PERMISSIONS.returns`,
"Returns"), with View and Edit. View covers the list, the detail, the sidebar
row and reading the return window. Edit covers status changes, recording a
refund and changing the window. Existing Staff roles got no row, so they have
No access until an Admin sets a level on Governance → Roles. Admin always has
it. The sidebar Returns row shows only with View. See
[PERMISSIONS.md](PERMISSIONS.md).

---

## 13. Edge cases

1. A delivered COD order that is still unpaid: the return is accepted, the
   refund is refused until the order is marked paid.
2. Window boundary: at exactly `returnableUntil` it is closed. An admin edit,
   including 0, changes only orders delivered afterwards.
3. A Declined return frees its quantity; every other status keeps it held.
4. Two requests for the same line at once: the order row lock serialises
   them, so the second sees the first's quantity.
5. Two refunds at once on one order: the `refundedAmount` guard lets one
   through and the other gets 409.
6. A deleted product or variant: the return still shows the `OrderItem`
   snapshot.
7. A guest order is not visible, and cannot be returned, until the shadow
   user is claimed.

---

## 14. Tests

`npm test` runs Vitest. `src/lib/returns.test.ts` covers `isReturnable`,
`returnableQuantity`, `checkReturnItems`, the transition matrix, `canRefund`,
`refundableAmount`, `suggestedRefund` and `paymentStatusAfterRefund`.
`src/validators/return.validator.test.ts` covers the required detail, duplicate
items, window bounds and the minimum refund amount. The transactions and races
(`createReturn`, `changeReturnStatus`, `recordRefund`) were verified by hand
only; run the QA plan after any change to them.

---

## 15. Known limits and follow-ups

1. **The admin order detail has no Returns panel yet.** Follow up after
   `feat/40-orders-admin` merges.
2. **`AdminOrderDetail.returns` is capped at `ORDER_RETURNS_LIMIT` (50).**
3. **`ReturnLine.unitPrice` excludes add-ons**, while `suggestedRefund`
   includes them.
4. **The cart summary and home benefits still read `RETURN_WINDOW_DAYS`**, not
   the setting, so they can disagree with a changed window.
5. **A `?order=` preset works only if the order is on the loaded page** of
   eligible orders.
6. **No confirm before Declined**, and a Declined return can't be reopened.
7. **No automatic restock** on `RECEIVED`.
8. **One refund per return**, entered by hand with a reference; nothing
   checks that the money moved.
9. **The return window is gated by the Returns permission.** A second store
    setting needs its own permission.
