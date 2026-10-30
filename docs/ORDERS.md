# Checkout, Orders and Guest Users

How an order is placed, how it moves from Confirmed to Delivered, how guest
checkouts get an owner, how a guest tracks an order, and what the admin
Orders and Fulfilment screens do. Built in Phase 5.

Read this before you change `src/services/checkout.service.ts`,
`src/services/order.service.ts`, `src/lib/orders.ts`, an order or checkout API
route, the account order screens, Track Order, or the admin Orders and
Fulfilment screens.
[CART.md](CART.md) covers pricing and the cart, [AUTH.md](AUTH.md) covers
sessions and sign-up, [PERMISSIONS.md](PERMISSIONS.md) covers the access
levels. This document covers what is specific to orders.

---

## 1. What this module covers

| Area | Where |
| --- | --- |
| Models | `prisma/schema/order.prisma`, migration `20261007063118_add_orders`, `User.isGuest` in `user.prisma` |
| Rules (pure, client safe) | `src/lib/orders.ts`, `src/lib/reference-number.ts` (node `crypto`, services only) |
| Guest users | `src/lib/auth/guest-user.ts` |
| Services | `src/services/checkout.service.ts`, `src/services/order.service.ts`, `loadPricedCart` in `cart.service.ts` |
| Validators | `placeOrderSchema` in `checkout.validator.ts`, `src/validators/order.validator.ts` |
| Types and hooks | `src/types/order.ts`, `src/hooks/use-checkout.ts`, `src/hooks/use-order.ts` |
| API | `/api/v1/checkout`, `orders/track`, `account/orders`, `admin/orders`, `admin/fulfilment` |
| Screens | `/checkout`, `/checkout/success`, `/order/track`, `/account/orders`, `/account/orders/[number]`, `/admin/orders`, `/admin/orders/[number]`, `/admin/fulfilment` |

Card and Apple Pay orders are created unpaid and paid on Stripe's hosted page;
coming back from Stripe marks them paid ([PAYMENTS.md](PAYMENTS.md)). Staff can
still mark them paid by hand (section 4). Refund calls and saved address
prefill are later phases.

---

## 2. Data model

`prisma/schema/order.prisma`. Money is an `Int` in fils, VAT included. Every
model has `id` (cuid), `createdAt` and `updatedAt`.

1. **`Order`** (`orders`). Keys: `number` (unique, `RW-` plus 8 digits),
   `idempotencyKey` (unique), `userId` (nullable, `onDelete: SetNull`; for a
   guest order it is the shadow user) and `placedAsGuest`. State: `status`,
   `paymentStatus` (default `UNPAID`), `paymentMethod`, `deliveredAt`,
   `returnableUntil`, `trackingNumber`, `staffNote` (never shown to the
   customer), `stripePaymentIntentId` (unique, the Stripe payment that paid
   it) and `stripeCheckoutSessionId` (unique, its current Stripe payment page;
   both in [PAYMENTS.md](PAYMENTS.md) §9). Contact snapshot: `email` (lowercased, what Track Order
   matches), `phone` (`+971…`), `firstName`, `lastName`, `emailOptIn`.
   Address snapshot: `address1`, `address2`, `city`, `postalCode`, `emirate`.
   Delivery snapshot: `deliveryMethod`, `deliveryEtaMinDays`,
   `deliveryEtaMaxDays`, and `deliveryAreaId` (nullable, `onDelete: SetNull`,
   indexed; the area's name is snapshotted in `city`). Money: `subtotal`, `discount`, `deliveryFee`,
   `total`, `vatIncluded`, `vatRatePercent`, `refundedAmount`, `couponCode`.
2. **`OrderItem`** (`order_items`), cascade from the order. `variantId` and
   `imageId` are nullable and `SetNull`. Everything shown is a snapshot:
   `productName`, `productSlug`, `brandName`, `sku`, `storage`, `colour`,
   `condition`, `grade`, `warrantyMonths`, `imageAlt`, `unitPrice`,
   `addOnUnitPrice`, `quantity`, `lineTotal`. Not a snapshot:
   `warrantyStartsAt` and `warrantyEndsAt` (set on delivery, §3), both
   nullable (migration `add_product_add_ons_and_warranty`). Each unit is a
   `Device` (`devices`) created with the line, holding its own serial or IMEI
   ([WARRANTY.md](WARRANTY.md) §2); the line's own `serialNumber` was
   dropped. `OrderLine.serials` lists the recorded serials in unit order.
3. **`OrderItemAddOn`** (`order_item_add_ons`): `name`, `kind`, `price` per
   unit (the effective price the cart charged, so a product's override when
   it had one), `extraWarrantyMonths`, and a nullable `addOnId` (`SetNull`).
   Unavailable add-ons were not charged and are not copied.
4. **`OrderStatusEvent`** (`order_status_events`): `status`, `note` (shown to
   the customer) and `actorId` (null means the customer or the system).
5. **`CouponRedemption`** (`coupon_redemptions`): one per order (`orderId`
   unique), `couponId` with `onDelete: Restrict`, `userId`, `discount`.
6. **Enums:** `OrderStatus`, `PaymentStatus`, `PaymentMethod`,
   `DeliveryMethod` (same values as `DELIVERY_METHODS` in `src/lib/delivery.ts`).
7. **`User.isGuest`** (default false) marks a shadow user (section 5).

Why it is shaped this way:

1. Snapshots on every line mean an order never changes when a product,
   add-on or price changes or is deleted.
2. `SetNull` from users and variants: an order loses its link, never its
   rows. Nothing on the customer or catalogue side can delete an order.
3. `Restrict` on the coupon: a used code can't be deleted. `deleteCoupon`
   answers 409 "This code has been used on orders. Disable it instead."
4. The address uses the checkout shape, not the `Address` model. Phase 3
   prefill will map street to `address1` and landmark to `address2`.
5. `returnableUntil` is stored at delivery and never recomputed, so a later
   change of the return window affects later deliveries only.
6. Delivery fee, ETA and area name are copied onto the order, so editing,
   renaming or disabling a zone or area never changes an order already placed.
   `deliveryAreaId` is only a link for reporting.
6. Order item images are kept: `sweepOrphans` and `releaseImage` only delete
   an image that no order item uses (`orderItems: { none: {} }`).

---

## 3. Statuses and transitions

All in `src/lib/orders.ts`.

| From | To |
| --- | --- |
| `PENDING_PAYMENT` ("Awaiting payment") | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `PROCESSING`, `CANCELLED` |
| `PROCESSING` | `DISPATCHED`, `CANCELLED` |
| `DISPATCHED` | `DELIVERED` |
| `DELIVERED`, `CANCELLED` | final |

1. **`initialStatus(method)`:** COD gives `CONFIRMED`; CARD and APPLE_PAY give
   `PENDING_PAYMENT`. `paysOnline(method)` is the same test (the method goes
   through Stripe).
2. **`nextStatuses(order)`** is `ORDER_TRANSITIONS[status]` without
   `CONFIRMED` while the order is not `PAID`. So a card order leaves Awaiting
   payment only by being marked paid (section 4) or cancelled.
3. **Cancel after Dispatched is refused** by the table. A cancel restocks and
   releases the coupon (section 7).
4. **`DELIVERED`** sets `deliveredAt` to now and `returnableUntil` to
   `returnableUntil(now, days)`, where `days` is
   `(await getStoreSettings(tx)).returnWindowDays`, the admin set return
   window ([RETURNS.md](RETURNS.md) §6). It falls back to `RETURN_WINDOW_DAYS`
   when no settings row exists. In the same transaction every line gets
   `warrantyStartsAt` = now and `warrantyEndsAt` = now plus its warranty
   months (`startWarranties` in `src/services/order.service.ts`). The months
   are `lineWarrantyMonths(line)`: the line's `warrantyMonths` plus the
   `extraWarrantyMonths` of its add-on snapshots. `warrantyEndsAt(start,
   months)` in `src/lib/orders.ts` adds calendar months in UTC and ends on the
   last day of a shorter month (31 January plus one month is 28 or 29
   February). Both helpers are pure and tested.
5. **`orderStatusTone(status)`** gives the badge tone. **`orderTimeline(status,
   events, placedAt)`** builds the customer steps Placed, Confirmed,
   Processing, Dispatched, Delivered: `at` and `note` come from the first
   event with that status. A cancelled order shows the steps it reached, then
   Cancelled. Awaiting payment shows Confirmed with `PAYMENT_PENDING_NOTICE`
   ("We'll confirm your order as soon as your payment goes through.").

---

## 4. Payment rules

A Stripe payment marks a card or Apple Pay order paid through
`recordStripePayment`, which applies rule 1 below with no actor and keeps the
payment id ([PAYMENTS.md](PAYMENTS.md) §4). Staff set the payment status by hand, in the
admin order detail. `paymentActions(order)` says what is allowed:

1. `UNPAID` to `PAID`, unless the order is `CANCELLED`.
2. `PAID` to `UNPAID`, only while `refundedAmount` is 0.
3. `PAID` to `REFUNDED`, only on a `CANCELLED` order. It sets
   `refundedAmount = total`.
4. `PARTIALLY_REFUNDED` and `REFUNDED` are also set by recording a refund on
   a return (`recordRefund`, [RETURNS.md](RETURNS.md) §5). Each refund adds to
   `refundedAmount`; the status is `REFUNDED` when `refundedAmount` equals
   `total`, else `PARTIALLY_REFUNDED`. A refund needs the order to be `PAID`
   or `PARTIALLY_REFUNDED`, and `paymentActions` is unchanged. The refund
   adds an `OrderStatusEvent` on the current status with the note "Refund of
   {amount} recorded for {RT number}" (staff view only).

Marking `PAID` on a `PENDING_PAYMENT` order also moves it to `CONFIRMED` with
the note "Payment received". Any other payment-only change records an
`OrderStatusEvent` with the current status and the note "Payment marked
{status}" (for example "Payment marked refunded"). A refused change answers
409 "This order can't be marked {status}."

---

## 5. The checkout transaction

`placeOrder(owner, sessionUser, input)` in `checkout.service.ts`, called by
`POST checkout`. `placeOrderSchema` is `checkoutInformationSchema` plus
`deliveryMethod`, `paymentMethod`, `expectedTotal` (fils, at least 0) and
`idempotencyKey` (a UUID).

Before the transaction:

1. No cart owner (no session and no guest cookie) answers 409 "Your cart is
   empty."
2. **Replay.** An order with this key is returned when the signed in caller
   owns it, or the caller is a guest and the order is `placedAsGuest`.
   Otherwise 409 "This checkout was already used. Refresh the page and try
   again."
3. `resolveDelivery(emirate, areaId)` (in `delivery-zone.service.ts`, see
   [CART.md](CART.md) §5) gives the fee and ETA for the method. The client
   never sends a fee: a mismatch only shows up as the `expectedTotal` 409
   below. Failures are 422 with a field:
   1. "We don't deliver to that emirate yet." on `fields.emirate` (no zone,
      or the zone is switched off).
   2. "Choose an area." on `fields.areaId` (the emirate has areas and none
      was sent).
   3. "We don't deliver to that area yet." on `fields.areaId` (unknown area,
      an area of another emirate, or one switched off).
   4. "Enter the city." on `fields.city` (no area and no city).
   A picked area's name is stored as `Order.city` and its id as
   `Order.deliveryAreaId`; otherwise `city` is what the customer typed.

The interactive transaction (retried whole up to `REFERENCE_NUMBER_ATTEMPTS`
on a unique violation when no order holds the key, which means the generated
number collided). It runs with `timeout: DB_WRITE_TIMEOUT_MS` (15 s) instead of
Prisma's 5 s default: it makes 20 to 30 database round trips, and over a slow
link (a remote database in development) 5 s was not enough and the order
failed with `P2028` on the last step:

1. **Lock the cart.** `lockCart` touches the cart row. No cart gives 409
   empty. Then the replay check runs again, which closes the double click
   race.
2. **Owner.** Signed in: the session user, and the order stores the session
   email. Guest: `resolveGuestUser` (section 6) and `placedAsGuest: true`.
3. **Price.** `loadPricedCart(db, owner, { deliveryFee, now })` in
   `cart.service.ts`. No lines is 409 empty; a blocking line issue is 409
   "Some items in your cart changed. Review your cart." (`fields.cart`); an
   attached coupon that is not valid is 409 with its message (`fields.code`);
   a total different from `expectedTotal` is 409 "Prices changed since you
   opened checkout. Check the new total." (`fields.expectedTotal`).
4. **Stock.** Lines sorted by `variantId`, so concurrent orders lock in one
   order. Each is `updateMany where { id, stock >= quantity }` with a
   decrement. Count 0 is 409 "Only {n} left of {product}." or, at 0, "{product}
   is out of stock." (`fields.cart`).
5. **Coupon, signed in only.** `updateMany where { id, usageLimit is null or
   redemptionCount < usageLimit }` incrementing `redemptionCount`. Count 0 is
   409 with the usage limit message (`fields.code`). A guest cart is never
   priced with a coupon ([CART.md](CART.md) §4.3), so a guest never redeems.
6. **Write.** One `order.create` with the nested items, add-ons and the first
   `OrderStatusEvent` (status from `initialStatus`), then the
   `CouponRedemption`, then the cart is emptied and its `couponId` cleared
   (`clearCheckedOutCart`).

Any thrown error rolls the whole thing back: stock, coupon count and the cart
are untouched.

After commit, the route calls `after(() => sendOrderConfirmation(order))`
when the order was created (not on a replay). It builds
`/order/track?number=…&email=…` with `appUrl` and sends
`orderConfirmationMessage`; CARD and APPLE_PAY emails carry
`PAYMENT_PENDING_NOTICE`. A failed send is logged and never fails the order.

Then, for an unpaid CARD or APPLE_PAY order (a replay too), the route calls
`startOnlinePayment`, which reuses the order's open Stripe page or opens one,
and returns `{ order, paymentUrl }` ([PAYMENTS.md](PAYMENTS.md) §2, §4).

**The client side of idempotency** is in `checkout-view.tsx`: the key lives in
a ref (`crypto.randomUUID`), reused after a network error or a 5xx, renewed
after a 4xx or a success. `expectedTotal` is the on screen total. See
[CART.md](CART.md) §9.

---

## 6. Guest users and claiming

A guest checkout needs an owner row so the order has a `userId` and a later
sign-up can claim it. That row is a **shadow user**.

1. **Shadow row:** `isGuest` true, `passwordHash` null, `emailVerifiedAt`
   null, role `CUSTOMER`, state `ACTIVE`. All three of `isGuest`, role and
   state are checked (`SHADOW_USER_WHERE`), so a guest row an admin promoted
   to Staff or Admin can never be claimed by a sign-up. It has no password,
   so sign-in always answers the same invalid credentials message
   ([AUTH.md](AUTH.md) §5).
2. **Invariant:** every path that sets a password also sets `isGuest` false
   (sign-up upgrade, password reset, admin `updateUser`). `updateUser` also
   sets it false when the role leaves `CUSTOMER`.
3. **`resolveGuestUser(tx, { email, fullName, phone })`** in
   `src/lib/auth/guest-user.ts`. It takes a transaction client and imports no
   `prisma` instance, so Vitest can drive it with a stub. It runs
   `createMany({ skipDuplicates: true })` (Postgres `ON CONFLICT DO NOTHING`)
   and re-selects by email. A shadow row is returned, with `fullName` and
   `phone` refreshed when it already existed; the refresh is guarded by
   `SHADOW_USER_WHERE`, so a sign-up that claims the row first makes it 409. A registered or `INACTIVE` row
   is 409 "An account with this email already exists. Sign in to continue."
   on `fields.email`. `skipDuplicates` is used instead of catching `P2002`,
   because a unique violation aborts the whole Postgres transaction. Two first
   time checkouts with one email make one shadow row.
4. **Sign-up upgrade.** `registerCustomer` calls `accountForSignUp(existing)`:
   none gives `create`, a shadow row gives `upgrade`, anything else
   `conflict` (the existing 409). An upgrade is `updateMany where { id,
   ...SHADOW_USER_WHERE }` with `upgradeData`: name, phone (null when not given, so
   the checkout phone does not survive), password hash, `isGuest: false`,
   `emailVerifiedAt: null` and `sessionVersion` incremented. A VERIFY email
   goes out as for any sign-up.
5. **Reset claims it.** `resetPassword` sets `isGuest: false`, and the
   `sessionVersion` bump signs out anyone who squatted on the address. The
   reset link proves the inbox, so `emailVerifiedAt` is set.
6. **What an account sees.** `accountOrdersWhere(user)` is `{ userId }`, plus
   `placedAsGuest: false` while `emailVerified` is false. Every account order
   read uses it. So someone who signs up with a guest's email first sees none
   of its guest orders until they verify the email; the real owner takes the
   account back through a password reset.

---

## 7. Cancel side effects

`applyStatusChange` in `order.service.ts`, inside one transaction:

1. The change is `updateMany where { id, status: from }`. Count 0 means
   someone else changed it: 409 "This order changed. Refresh and try again."
2. One `OrderStatusEvent` with the actor and the note.
3. `CANCELLED`: `releaseOrder` adds each line's quantity back to its variant
   (lines whose variant was deleted are skipped), deletes the
   `CouponRedemption` and decrements the coupon's `redemptionCount`.

A transition the table does not allow is 409 "An order that is {from} can't
move to {to}." on `fields.status`.

---

## 8. Track Order

`/order/track` (`src/components/order/track-order.tsx`) is the one order view a
guest has. The form takes the order number and email, both prefilled from
`?number=` and `?email=`; when both arrive and are valid the lookup runs at
once. The confirmation email and the success page link to it that way.

1. `POST orders/track` matches the number and the lowercased email against the
   order's email snapshot. Every failure is one 404 "We couldn't find an order
   with those details." so the form can't be used to probe order numbers.
2. `orderNumberValidator` trims and uppercases the number and requires
   `RW-` plus 8 digits.
3. The result is an `OrderDetail` shown by `OrderDetailBody` (timeline, lines,
   totals, delivery, tracking number). It never includes the staff note.
4. `useGetTrackedOrder({ number, email })` is a `useQuery` with a POST
   `queryFn`, enabled when both are set, with `retry: false`.

---

## 9. API

Every route returns through `apiSuccess` / `apiError`. Order numbers in a URL
are normalised by `orderNumberParamsSchema`; a malformed number answers 404,
not 422. Paths are in `API_ENDPOINTS` (`checkout.place`, `orders.track`,
`account.orders`, `account.order(number)`, `admin.orders.{list, detail,
status, payment}`, `admin.fulfilment.{list, detail}`).

| Route | Auth | Success | Errors |
| --- | --- | --- | --- |
| `POST checkout` | session optional; `placeOrder` limit (user id, else IP) | 201 `PlacedOrder` `{ order, paymentUrl }`, 200 on a replay | 409 (empty cart, `fields.cart`, `fields.code`, `fields.expectedTotal`, stock, `fields.email`, key used), 422, 429, 502 and 503 from Stripe ([PAYMENTS.md](PAYMENTS.md) §4) |
| `POST checkout/payment` | none; `confirmPayment` limit by IP | 200 `OrderDetail` | see [PAYMENTS.md](PAYMENTS.md) §4 |
| `POST orders/track` | none; `trackOrder` limit by IP | 200 `OrderDetail` | 404 (one message), 422, 429 |
| `GET account/orders?page` | session | 200 `Paginated<OrderSummary>`, `ACCOUNT_LIST_PAGE_SIZE` per page, newest first | 401, 422 |
| `GET account/orders/[number]` | session | 200 `OrderDetail` | 401, 404 "We couldn't find that order." for any miss |
| `GET admin/orders` | `sales.orders` View | 200 `Paginated<AdminOrderRow>`, newest first | 403, 422 |
| `GET admin/orders/[number]` | `sales.orders` View | 200 `AdminOrderDetail` | 403, 404 |
| `PATCH admin/orders/[number]` | `sales.orders` Edit | 200 `AdminOrderDetail` | 403, 404, 422 |
| `PATCH admin/orders/[number]/status` | `sales.orders` Edit | 200 `AdminOrderDetail` | 403, 404, 409, 422 |
| `PATCH admin/orders/[number]/payment` | `sales.orders` Edit | 200 `AdminOrderDetail` | 403, 404, 409, 422 |
| `GET admin/fulfilment` | `sales.fulfilment` View | 200 `Paginated<AdminOrderRow>`, oldest first | 403, 422 |
| `PATCH admin/fulfilment/[number]` | `sales.fulfilment` Edit | 200 `AdminOrderRow` | 403, 404, 409, 422 |

Request bodies and queries (`src/validators/order.validator.ts`):

1. **`POST checkout`:** `placeOrderSchema` (section 5).
2. **`POST orders/track`:** `{ number, email }`.
3. **`GET account/orders`:** `page` (default 1). There is no status filter.
4. **`GET admin/orders`:** pagination, `search` (up to `SEARCH_QUERY_MAX_LENGTH`;
   matches number, email or last name, case insensitive), `status`,
   `paymentStatus`.
5. **`PATCH admin/orders/[number]`:** `trackingNumber` (up to
   `TRACKING_NUMBER_MAX_LENGTH`) and/or `staffNote` (up to
   `STAFF_NOTE_MAX_LENGTH`); at least one, else "Nothing to update."
6. **`PATCH …/status`:** `{ status, note }`, `note` up to
   `ORDER_NOTE_MAX_LENGTH` and shown to the customer.
7. **`PATCH …/payment`:** `{ paymentStatus: "PAID" | "UNPAID" | "REFUNDED" }`.
8. **`GET admin/fulfilment`:** pagination and `status` (`CONFIRMED`,
   `PROCESSING` or `DISPATCHED`). With no filter the queue lists all three.
9. **`PATCH admin/fulfilment/[number]`:** `status` (`PROCESSING`,
   `DISPATCHED` or `DELIVERED`), `trackingNumber` and/or `serials`
   (`[{ deviceId, serialNumber }]`, up to `CART_MAX_LINES` ×
   `CART_MAX_LINE_QUANTITY`, each trimmed, up to `SERIAL_NUMBER_MAX_LENGTH`;
   empty clears it). Tracking is saved first, then the serials, then the
   status, in one transaction through the same `applyStatusChange`, so the
   same rules, side effects and 409s apply. A serial for a device that is not
   on this order is 422 on `serials`. The
   change log records the serials with the status and tracking.
   An order outside the fulfilment queue (not `CONFIRMED`, `PROCESSING` or
   `DISPATCHED`) is 409 "This order isn't in the fulfilment queue."; tracking
   edits on other orders go through `PATCH admin/orders/[number]`.

Response shapes are in `src/types/order.ts`: `OrderDetail` (number, placedAt,
status, paymentStatus, paymentMethod, delivery method and ETA, deliveredAt,
returnableUntil, trackingNumber, contact, address, `lines`, `totals`
{ subtotal, discount, delivery, total, vatIncluded, vatRatePercent, refunded },
couponCode, `timeline`), `OrderSummary` (list card with the first line),
`AdminOrderRow` (with `items`: id, product name, SKU, quantity and
`devices` { id, unitNumber, serialNumber } per line, so the Fulfilment row can
edit each device's serial), and `AdminOrderDetail` (adds `customer` { id, fullName,
email, isGuest } or null, `placedAsGuest`, `staffNote`, `events` oldest first
up to `ORDER_EVENT_LIMIT`, `nextStatuses`, `paymentActions`, `returns`
{ number, status }[] oldest first up to `ORDER_RETURNS_LIMIT`). Each line in
`OrderLine` carries `returnableQuantity`: the bought quantity minus what sits
on returns that are not Declined ([RETURNS.md](RETURNS.md) §3).

**Audit.** Every admin mutation (`PATCH` order, status, payment, and
fulfilment) calls `recordAudit` with action `UPDATE`, the order number as the
record id and label, and a before and after view (status, payment status,
tracking number, staff note; fulfilment records status and tracking number).
Reads are not audited. See [TRASH-AUDIT.md](TRASH-AUDIT.md).

---

## 10. Hooks

`src/hooks/use-checkout.ts`:

1. **`usePlaceOrder()`** posts `checkout.place` (resolving to `PlacedOrder`), writes the order into
   `checkoutKeys.placed(number)`, and invalidates `cartKeys.all` and
   `orderKeys.all`.
2. **`usePlacedOrder(number)`** reads that cache only (`skipToken`, never
   fetches). A reload of the success page therefore has nothing.
3. **`useConfirmPayment(sessionId)`** posts `checkout.confirmPayment` when the
   customer is back from Stripe ([PAYMENTS.md](PAYMENTS.md) §5).

`src/hooks/use-order.ts`, keys under `orderKeys` (`"orders"`):

1. Storefront: `useGetAccountOrders(page)`, `useGetAccountOrder(number)`,
   `useGetTrackedOrder({ number, email })`.
2. Admin: `useGetAdminOrders(filters)`, `useGetAdminOrder(number)`,
   `useGetFulfilmentOrders(filters)`.
3. Mutations: `useUpdateOrder`, `useChangeOrderStatus`,
   `useChangeOrderPayment`, `useUpdateFulfilment`. Each invalidates
   `orderKeys.all`.

---

## 11. Screens

**Admin Orders** (`/admin/orders`, `OrderManagement`). Module `sales.orders`;
the page checks `hasPermission` and shows "Access denied" otherwise. Search by
number, email or last name, a status filter, a payment filter, pagination.
Each row shows number, date, customer (with a Guest badge when
`placedAsGuest`), status, payment, total and lines.

**Order lines on every order screen.** A line with add-ons shows an "Item" row
and one row per add-on with its price × quantity (`LineBreakdown`, see
[CART.md](CART.md) §9). The account order detail, Track Order and the admin
order detail also show the warranty months, the serial when set, and
"Warranty until {date}" once the order is delivered.

**Admin order detail** (`/admin/orders/[number]`, `OrderDetailScreen`).
Panels: Items with totals, History (oldest first, notes are customer
visible), Status, Payment, Delivery (tracking number and staff note), and
Customer (with a Guest badge). Buttons come from `useModuleAccess`: without
Edit the panels are read only.

1. **Status** offers one button per `order.nextStatuses` and an optional note
   to the customer. Cancel asks for confirmation.
2. **Payment** offers one button per `order.paymentActions`. Refunded asks for
   confirmation. While Awaiting payment, it says marking paid confirms the
   order.
3. **Tracking and staff note** save through `PATCH admin/orders/[number]`.

**Admin Fulfilment** (`/admin/fulfilment`, `FulfilmentQueue`). Module
`sales.fulfilment`. A queue of Confirmed, Processing and Dispatched orders,
oldest first, with a "Whole queue" status filter. Each row has a tracking
number field, one "Serial / IMEI" field per device (a line of 3 shows 3
fields, labelled "Unit n of 3"), Save when tracking or a serial
changed, and one "Move to {next}" button (Confirmed to Processing, Processing
to Dispatched, Dispatched to Delivered). Moving to Delivered starts each
line's warranty. The order
number links to the detail only when the viewer also holds `sales.orders`
View. Without Edit the row is read only.

**Checkout success** (`/checkout/success?order=RW-…`, `OrderSuccess`). Shows
the order from `usePlacedOrder`, or from `useGetAccountOrder` when signed in
and the cache is empty. With `session_id` (back from Stripe) it confirms the
payment first and shows the order from that; with `payment=cancelled` it shows
the payment not finished panel ([PAYMENTS.md](PAYMENTS.md) §2). An unpaid card
or Apple Pay order shows `PAYMENT_PENDING_NOTICE`. Track
order goes to `/account/orders/{number}` when signed in, or to
`/order/track?number=…&email=…` for a guest. A guest who reloads has no cache,
so the page offers "Track your order" with only the number filled in.

**Account orders** (`/account/orders`, `AccountOrders`). A paged list of
`OrderSummaryCard`s. While the account email is unverified a notice reads
"Orders you placed as a guest appear once you verify your email." The account
overview shows the latest orders and an "active" count from page 1 only (an
order is active while it has a next status), so with more than one page the
count can be low.

**Account order detail** (`/account/orders/[number]`, `AccountOrderDetail`).
`OrderDetailBody` shared with Track Order. A number the account can't see is
the "Order not found" state. The account view passes `returnLinks`: while the
order is returnable (`isReturnable`) and a line has `returnableQuantity > 0`,
the items header shows "Request a return" and each such line "Return this
item", both linking to `/account/returns?order=…` (plus `&item=<orderItemId>`
for a line). A delivered order past `returnableUntil` shows "Return window
closed". Track Order shows no return links; on a returnable order it tells the
guest to create an account with the order email (or reset its password) and
verify it, then request the return from the account.

---

## 12. Constants and rate limits

In `src/lib/constants.ts`.

| Constant | Value | Used by |
| --- | --- | --- |
| `ORDER_NUMBER_PREFIX` | `RW-` | Order numbers, `orderNumberValidator` |
| `REFERENCE_NUMBER_DIGITS` | 8 | `generateReference`, the number pattern |
| `REFERENCE_NUMBER_ATTEMPTS` | 3 | Retries on a number collision |
| `ACCOUNT_LIST_PAGE_SIZE` | 10 | `GET account/orders` |
| `ACCOUNT_RECENT_ORDERS_LIMIT` | 3 | Recent orders on the account overview and the list skeleton |
| `ORDER_NOTE_MAX_LENGTH` | 500 | Customer visible status note |
| `STAFF_NOTE_MAX_LENGTH` | 1000 | Staff note |
| `TRACKING_NUMBER_MAX_LENGTH` | 64 | Tracking number |
| `SERIAL_NUMBER_MAX_LENGTH` | 120 | Serial or IMEI on an order line |
| `ORDER_EVENT_LIMIT` | 50 | Events read per order |
| `RETURN_WINDOW_DAYS` | 30 | Default window when no store settings row exists; the live value is `StoreSettings.returnWindowDays` |
| `MS_PER_DAY` | 86 400 000 | `returnableUntil` |
| `ORDER_TRACK_PAGE_PATH`, `ACCOUNT_ORDERS_PATH` | `/order/track`, `/account/orders` | Links |
| `RATE_LIMITS.placeOrder` | 10 per 10 minutes, per user, else per IP | `POST checkout` |
| `RATE_LIMITS.trackOrder` | 10 per 15 minutes, per IP | `POST orders/track` |

Rate limits work as described in [AUTH.md](AUTH.md) §7. No environment
variable was added.

---

## 13. Permissions

Two modules in the Sales area, each with View and Edit (no Create, Delete,
Publish or Restore):

1. **`sales.orders`** (`PERMISSIONS.orders`): the Orders list and detail, and
   the order, status and payment mutations.
2. **`sales.fulfilment`** (`PERMISSIONS.fulfilment`): the queue and its
   mutation.

Existing Staff roles got no rows, so they have No access until an Admin sets a
level on Governance → Roles. Admin always has both. Fulfilment Edit changes
tracking and status only; it cannot edit the staff note or the payment status.
See [PERMISSIONS.md](PERMISSIONS.md).

---

## 14. Tests

`npm test` runs Vitest. Phase 5 added `src/lib/orders.test.ts` (transition
matrix, payment rules, `returnableUntil`, `accountOrdersWhere`, timeline),
`src/lib/auth/guest-user.test.ts` (stub transaction: create, reuse, the race,
`accountForSignUp`, `upgradeData`), `src/lib/reference-number.test.ts`,
`src/validators/order.validator.test.ts` and additions to
`checkout.validator.test.ts`. Warranty tracking added `warrantyEndsAt` and
`lineWarrantyMonths` cases to `orders.test.ts` and the `serials` cases to
`order.validator.test.ts`. They cover pure rules only.

---

## 15. Known limits

1. **Stripe payments** have their own limits; see [PAYMENTS.md](PAYMENTS.md) §12.
2. **Rate limits are in memory.** They reset on restart and are per
   instance ([AUTH.md](AUTH.md) §11).
3. **The customer email is in the confirmation URL**
   (`/order/track?number=…&email=…`), so it reaches server logs and browser
   history. Accepted: the number alone is not enough to read an order, and the
   email is the second factor.
4. **The database transactions have no automated tests.** `placeOrder`, the
   stock and coupon guards, the cancel side effects and the claim paths were
   verified by hand only. Run the QA plan after any change to them.
5. **A guest who reloads the success page** loses the cached order and must use
   Track Order.
6. **Guest checkout leaves a `users` row per email.** It is a shadow row that
   a sign-up or password reset can claim; it never expires.
7. **A guest can't use a promo code.** The field shows, but Apply asks them to
   sign in; the guest cart merges on sign-in.
8. **The account overview "active" count reads page 1 only.**
9. **No saved address prefill** until Phase 3.
10. **Staff can't edit the contact or address** on an order; only tracking,
    status, payment and the staff note change.
11. **One serial per device.** Each unit on a line is a `Device` with its
    own serial ([WARRANTY.md](WARRANTY.md) §2). Serials are edited in
    Fulfilment, and after delivery on the Warranty & Claims Edit page
    ([WARRANTY.md](WARRANTY.md) §6).
12. **Warranty dates are written at delivery.** Later changes to the product
    or add-on do not move them; a line delivered before this change has none.
    Staff can correct the start on the Warranty & Claims Edit page, which
    recalculates the end ([WARRANTY.md](WARRANTY.md) §6).
13. **The admin orders and Fulfilment lists load each order's lines** (id,
    name, SKU, quantity, serial), at most `CART_MAX_LINES` per order, for the
    serial inputs.
