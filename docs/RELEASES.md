# Releases

How staff run limited drops: a release with its own schedule, several products
and variants, stock set aside per variant and a purchase limit per customer.

Read this before you change `prisma/schema/release.prisma`,
`src/lib/releases.ts`, `src/services/release.service.ts`,
`src/services/release-allocation.service.ts`,
`src/services/release-storefront.service.ts`,
`src/services/release-hold.service.ts`,
`src/services/waitlist.service.ts`, a release or waitlist API route, the admin
Releases screens or the storefront release pages. Read section 13 as well
before you change a release's reminder times, the release test emails, the
waitlist deletion or `TEST_MODE`. Read section 14 as well before you change
release lines in the cart or at checkout, the hold, the per customer limit,
the hold time setting or the stock sweeps on the timer.
[CATALOGUE.md](CATALOGUE.md) covers products and variants,
[PERMISSIONS.md](PERMISSIONS.md) covers access levels,
[MESSAGING.md](MESSAGING.md) covers how every message is sent and recorded.

Issue #108 is delivered in four parts. This document covers part 1, release
management (#116), part 2, the storefront pages and waitlists (#117, section
12), part 3, the notification emails (#118, section 13), and part 4, buying
with checkout holds (#119, section 14).

There is no limit on releases per month, and schedules may overlap. Each
release keeps its own schedule, allocations and limit.

---

## 1. What this module covers

| Area | What exists |
| --- | --- |
| Rules | `src/lib/releases.ts`: statuses, what can change in each, publish checks. Pure, tested with Vitest |
| Database | `Release`, `ReleaseAllocation`, `WaitlistEntry`, `ReleaseHold`, `ReleaseCustomerTally`; `ReleaseEmail` exists but is unused, because `MessageLog` records the emails instead (section 13) |
| Admin API | `/api/v1/admin/releases` (list, create), `[id]` (read, update, delete), `[id]/state`, `[id]/allocations`, `[id]/waitlist`, `[id]/test-emails`; `/api/v1/admin/release-settings` (the hold time, section 14) |
| Admin | Sales → **Releases** (`/admin/releases` with its Hold button, `/admin/releases/[id]` with its Emails and Waitlist panels) |
| Emails | The welcome, the reminders at each saved time, the live email, the test emails and the waitlist deletion (section 13) |
| Dashboard | The Live Release card ([ADMIN-PANEL.md](ADMIN-PANEL.md)) |
| Storefront | `/releases`, `/releases/[slug]` with Add to cart while Live, the homepage's Upcoming drops, the waitlist dialog, Account → Waitlists, `/waitlist/confirm`, `/waitlist/leave` (sections 12 and 14) |
| Storefront API | `POST /api/v1/releases/[slug]/waitlist`, `/api/v1/waitlist/confirm`, `/api/v1/waitlist/leave`, `/api/v1/account/waitlists` (section 12); `releaseId` on `POST /api/v1/cart/items` and `POST /api/v1/checkout/hold` (section 14) |
| Stock sweeps | Expired holds, lapsed unpaid release orders and ended releases, every minute (section 14) |

---

## 2. Data model

**Release**: `title`, `edition`, `description`, `slug` (set once from the title
plus a random suffix), `startsAt` (opening), `endsAt`, `publishedAt` (null means
Draft), `hidden`, `maxPerCustomer` (at least 1), `reminderOffsetsMinutes`
(how many minutes before the opening the waitlist is reminded; `createRelease`
writes the defaults, 48 hours and 1 hour, and staff change the list as
`reminders` in Draft and Upcoming, section 13), `completedAt` (set once, when
the release completes and its unsold units go back to shop stock: by End
release, or by the timer within a minute of `endsAt`, section 14).

**ReleaseAllocation**, one row per release and variant: `allocated`,
`available` (on sale), `reserved` (held at checkout), `sold` (on orders,
unpaid card orders included), `returned` (sent back to the variant's shop
stock when the release completed). A database CHECK keeps
`allocated = available + reserved + sold + returned` with every counter at 0 or
more, so no code path can lose a unit. Section 14 says which step moves which
counter.

**ReleaseHold**: units of one allocation held for one cart. `allocationId`,
`cartId`, `orderId` (set when the order is placed), `quantity` (above 0),
`expiresAt`, `status`: `HELD`, then `ORDERED` once on an order, or
`RELEASED` once its units went back.

**ReleaseCustomerTally**: how many units of a release one account has on
orders that are not cancelled, keyed on release and user, never below 0. It
enforces `maxPerCustomer` (section 14).

**On other tables.** `CartItem.releaseId` and `OrderItem.releaseId` name the
release a line is bought from (null for the shop; an order line's release
can't be deleted). `Order.releaseHoldUntil` is the payment deadline of a card
or Apple Pay order with release lines. `StoreSettings.releaseHoldMinutes` is
the hold time (default 15, at least 1).

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
2. `completedAt` set, or `endsAt` passed: **Completed**. The status turns
   Completed at the end time; the timer sets `completedAt` and returns the
   units within a minute (section 14).
3. Before `startsAt`: **Upcoming**.
4. No `available` units left: **Sold out**. Held and sold units don't count.
   It returns to Live when units come back: a hold lapses or is dropped, or an
   order is cancelled (section 14).
5. Otherwise: **Live**.

`hidden` is a separate flag shown as its own badge. The list's status filter
uses the same rules as database conditions.

Buying follows the status (`releaseOpenForSale`). A release takes new cart
lines and new holds only while Live and not hidden. An order whose units are
already held goes through while Live or Sold out, and not hidden. Hiding a
live release stops its buying too (section 14).

---

## 4. What can change in each status

`allowedEdits(status)`:

| Status | Text | Hidden | Limit | Opening | End | Allocations | Reminders |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Draft | yes | yes | yes | yes | yes | yes | yes |
| Upcoming | yes | yes | yes | yes | yes | yes | yes |
| Live, Sold out | yes | yes | yes | no | yes, not in the past | up, or down by unsold units | no |
| Completed | yes | yes | no | no | no | no | no |

A locked field sent with a new value answers 422 with the field named.
`reminders` left out of the request is not a change, and neither is the same
list in another order.

---

## 5. Actions

`PATCH /api/v1/admin/releases/[id]/state` with `{ action }`:

1. **Publish** (Draft only). Needs at least one allocated unit, an end time
   after the opening and not already past, and a limit of 1 or more. A future
   opening makes it Upcoming, a past one Live at once.
2. **Unpublish** (Upcoming only) returns it to Draft.
3. **End release** (Upcoming, Live, Sold out) sets the end to now. An opening
   still in the future moves to just before now, so the end stays after it.
   In the same transaction it completes the release (`completeRelease`,
   section 14): held units are released and every unsold unit goes back to
   its variant's shop stock at once, counted as `returned`. Units on orders
   stay sold. The release is now Completed, so its waitlist is deleted for
   good within about 5 minutes (section 13).

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
Log. The test emails route changes nothing, so it records nothing.

| Route | Needs | Purpose |
| --- | --- | --- |
| `GET /api/v1/admin/releases` | View | Page of releases. Query `page`, `pageSize`, `search` (title or edition), `status`, `sort` (`opens_desc`, `opens_asc`). Each row has its product count, allocated, sold and remaining |
| `POST /api/v1/admin/releases` | Create | New Draft. `reminders` is optional; without it the release gets the default times (section 13) |
| `GET /api/v1/admin/releases/[id]` | View | The release with its `reminders` and its allocations, each with the variant, product and current stock |
| `PUT /api/v1/admin/releases/[id]` | Edit | Update, within section 4. `reminders` left out keeps the saved times |
| `DELETE /api/v1/admin/releases/[id]` | Delete | Section 5 |
| `PATCH /api/v1/admin/releases/[id]/state` | Edit | `{ action: "PUBLISH" \| "UNPUBLISH" \| "END" }` |
| `PUT /api/v1/admin/releases/[id]/allocations` | Edit | Section 6 |
| `POST /api/v1/admin/releases/[id]/test-emails` | Edit | No body. Sends the release's emails to the signed in admin (section 13) |
| `GET /api/v1/admin/release-settings` | View | The hold time, `{ releaseHoldMinutes, updatedAt }` (section 14) |
| `PUT /api/v1/admin/release-settings` | Edit | `{ releaseHoldMinutes }`, 1 to 30 (section 14) |

`reminders` is a list of whole minutes before the opening, for example
`[2880, 60]`. Its rules are in section 13. The storefront routes for buying
are in section 14.

Hooks: `src/hooks/use-release.ts`. Validators:
`src/validators/release.validator.ts`.

---

## 8. Screens

1. **`/admin/releases`** lists releases with name and edition, opening (Dubai
   time), products, allocated, sold, remaining, status and a Hidden badge.
   Search, a status filter and sort by opening date. New release opens the
   create form, which lands on the release's page. The create form has no
   Reminders field: a new release starts with the default times, and staff
   change them on its page. The header's **Hold: N min** button opens
   `ReleaseSettingsDialog`, which changes how long checkout holds release
   units (section 14).
2. **`/admin/releases/[id]`** has the details form (fields lock per section
   4), the allocations table (in stock, allocated, reserved, sold, returned,
   remaining; reserved is held at checkout, sold is on orders, unpaid card
   orders included) with Add product, and the Publish, Unpublish, End release and
   Delete buttons, each shown only when allowed. The details form includes
   **Reminders**: one row per reminder, a number and a Minutes, Hours or
   Days dropdown, with **Add reminder** and **Remove**. The **Emails** panel lists what the waitlist is sent and when, and holds
   **Send test emails to me** (section 13).

---

## 9. Limits and constants

In `src/lib/constants.ts`: `RELEASE_TITLE_MAX_LENGTH`,
`RELEASE_EDITION_MAX_LENGTH`, `RELEASE_DESCRIPTION_MAX_LENGTH`,
`RELEASE_MAX_PER_CUSTOMER_DEFAULT`, `RELEASE_MAX_PER_CUSTOMER_LIMIT`,
`RELEASE_ALLOCATIONS_MAX` (variants per release), `RELEASE_SLUG_SUFFIX_BYTES`,
`RELEASE_REMINDER_DEFAULTS_MINUTES`, `RELEASE_EARLY_END_OPENING_SHIFT_MS`.

Part 2: `RELEASES_PAGE_PATH`, `RELEASES_PAGE_SIZE` (12),
`HOMEPAGE_DROPS_LIMIT` (5), `SITEMAP_RELEASE_LIMIT` (1000),
`WAITLIST_CONFIRM_PAGE_PATH`, `WAITLIST_LEAVE_PAGE_PATH`,
`WAITLIST_CONFIRM_LINK_TTL_SECONDS` (48 hours),
`WAITLIST_LEAVE_LINK_TTL_SECONDS` (180 days), `WAITLIST_PAGE_SIZE` (the
account list size), `WAITLIST_ADMIN_PAGE_SIZE` (50) and
`RATE_LIMITS.joinWaitlist` (5 per 15 minutes).

Part 3: `RELEASE_REMINDER_DEFAULTS_MINUTES` (2880 and 60, which is 48 hours
and 1 hour), `RELEASE_TEST_REMINDER_DEFAULTS_MINUTES` (10 and 5),
`RELEASE_REMINDERS_MAX` (5 times per release), `RELEASE_REMINDER_MAX_MINUTES`
(20,160, which is 14 days, worked out from `RELEASE_REMINDER_LOOKAHEAD_DAYS`),
`RELEASE_SWEEP_INTERVAL_MS` (1 minute), `RELEASE_TEST_EMAIL_SUBJECT_PREFIX`
("[Test] "), `RELEASE_TEST_ENTRY_ID`, `TEST_MODE_ON_VALUE` ("true") and
`RATE_LIMITS.releaseTestEmails` (5 per 15 minutes). The timings every timed
message shares (`MESSAGE_SWEEP_BATCH`, `MESSAGE_SCHEDULE_GRACE_MINUTES`,
`MESSAGE_SWEEP_INTERVAL_MS`, `COUNTDOWN_MIN_OFFSET_MINUTES`,
`MESSAGE_MAX_ATTEMPTS`) are listed in [MESSAGING.md](MESSAGING.md).

Part 4: `RELEASE_HOLD_MINUTES_DEFAULT` (15), `RELEASE_HOLD_MINUTES_MAX` (30,
the same as `CHECKOUT_PAYMENT_WINDOW_MINUTES`), `RELEASE_MIN_PAYMENT_MINUTES`
(5), `RELEASE_HOLD_SWEEP_BATCH` (20), `RELEASE_LAPSED_ORDER_BATCH` (10) and
`RELEASE_COMPLETE_BATCH` (5). Section 14 says what each does.

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

1. A release's slug never changes after create.
2. A variant with held, sold or returned units on a release can't be removed
   from its product, even once the release is completed (section 6).
3. Waitlisters get the confirm email, a welcome once confirmed, countdown
   and reminder messages at each saved offset, a drop live message and a back
   in stock email (section 13). WhatsApp (countdown, reminder, live) is sent
   only with the WhatsApp opt in and a phone, once credentials are approved.
   See [MESSAGING.md](MESSAGING.md).
4. The rate limits live in memory per server instance, like every other
   `RATE_LIMITS` rule ([AUTH.md](AUTH.md) §7).
5. The header's mega menu, the mobile drawer's drop list and the
   Invitation's ledger still read mock `src/lib/drops.ts`.
6. A reminder or the live email reaches at most 3,000 people per release:
   the sweep sends 50 a minute and a message is due for 60 minutes. A
   reminder set less than 60 minutes before the opening reaches fewer, 50 for
   each minute it is set ahead, because no reminder is sent once the release
   has opened. Anyone beyond the ceiling is not sent that message. Lifting it
   needs a bulk email service, which is separate work.
7. A release email leaves up to a minute after its time, since the check
   runs once a minute.
8. A completed release's waitlist is deleted, so it can no longer be listed,
   exported or counted (section 13).
9. `MessageLog` keeps the recipient address of every message it recorded,
   after the waitlist itself is deleted.
10. `StoreSettings.releaseEmailGraceMinutes` and the `ReleaseEmail` table are
    unused. The grace is the constant `MESSAGE_SCHEDULE_GRACE_MINUTES` and
    the emails are recorded in `MessageLog`.
11. A hidden release sends no reminders and no live email, because the sweep
    reads only releases that are published, not hidden and not completed.
12. Card and Apple Pay units count as sold while payment is pending, up to
    the payment deadline (section 14).
13. After a hold lapses, Hold again takes the units back if they are still
    free, so a customer can keep holding again.
14. No back in stock email goes out when a hold lapses or an order is
    cancelled. `notifyBackInStock` sends to the whole waitlist on every call,
    so calling it on each lapse would flood the waitlist.
15. The limit is per account. Checkout needs sign in, so every release order
    belongs to one. A guest cart is checked against `maxPerCustomer` alone
    until the customer signs in and holds.
16. A returned item gives back neither release units nor the limit: Returns
    don't touch the allocation or the tally.
17. Every hold, release order, cancel and completion waits on its release
    row's lock. That is fine at this store's volume, but it serialises the
    buyers of one release.
18. A card or Apple Pay order whose Stripe page completed without a
    confirmed payment (a delayed bank method still processing) is never
    cancelled automatically. It is checked with Stripe again every minute
    until it is paid or staff cancel it, and ten such orders fill the lapsed
    order batch, so later lapsed orders wait behind them. Cards and Apple Pay
    confirm at once; this needs a delayed method turned on in Stripe.
19. `dropVariantAllocations` deletes allocations without the release lock. A
    product save that removes a variant at the moment its release completes
    could deadlock; Postgres aborts one of the two, which fails with an
    error. The timer tries an unfinished completion again on the next tick.
20. Every hold bumps `Release.updatedAt`, because the release lock is an
    update. That moves the release's last modified date in the sitemap and
    `updatedAt` on the admin release detail.

---

## 12. Storefront and waitlists (#117)

### Which releases shoppers see

`visibleReleaseWhere(now)` (`src/services/release-storefront.service.ts`):
published, not hidden, not completed (`notCompletedWhere` from
`release.service.ts`), with a slug, and with at least one variant whose
product is not in Trash. Variants of products in Trash are left out of the
page too. Draft, hidden and completed releases are never shown, and their
pages answer 404.

1. `listStorefrontReleases({ page, pageSize })`: a page of summaries, earliest
   opening first (status, opening, end, units left, product names, first
   image, cheapest price).
2. `getStorefrontRelease(slug)`: the summary plus the description and each
   product with its variants and units left, or null.
3. `toPublishedDrop(summary)`: the same summary as a homepage drop card
   ([HOMEPAGE-CMS.md](HOMEPAGE-CMS.md) §4).
4. `listSitemapReleases()`: slugs for the sitemap, at most
   `SITEMAP_RELEASE_LIMIT`.

The pages call these services directly; there is no storefront GET API.

### Pages

1. **`/releases`**: `RELEASES_PAGE_SIZE` releases a page as drop cards
   (`ReleaseGrid`). A live card opens the release; an upcoming or sold out
   card opens the waitlist dialog. Previous and next links; a page past the
   end answers 404.
2. **`/releases/[slug]`**: title, edition, status, opening time in Dubai time,
   a countdown to the opening while upcoming and to the end while live, "Up
   to N per customer", the description, and each product with its variants,
   prices and "N left" or "Sold out" per variant. While the release is Live,
   a variant with units left has **Add to cart** (section 14). **Notify me**
   opens the waitlist dialog in every status. Product names are not linked,
   since a release only product may not be public.
3. The homepage's **Upcoming drops** shows the first `HOMEPAGE_DROPS_LIMIT`.
4. The sitemap lists `/releases` and each shown release page.

### Joining a waitlist

`POST /api/v1/releases/[slug]/waitlist` with
`{ email, emailOptIn, whatsappOptIn, phone }` (`joinWaitlistSchema`). A phone
is required when WhatsApp is on and follows [PHONE-NUMBERS.md](PHONE-NUMBERS.md). One entry per release and email
(`@@unique([releaseId, email])`).

1. **Signed in, verified, same email**: the entry is linked to the account and
   confirmed at once. Answers `{ status: "CONFIRMED" }`.
2. **Anyone else** (guest, unverified, or another email): answers
   `{ status: "CHECK_INBOX" }` every time, so the answer never shows whether
   an email is already on the list. A confirm email goes out, after the
   response (`after()`), only while the entry is unconfirmed. A guest submit
   never changes an existing entry's preferences.
3. Rate limited by `joinWaitlist`, per user when signed in, else per IP.
4. A release that isn't shown answers 404.

### Links in emails

`src/lib/waitlist-links.ts` signs `entry id + purpose + expiry` with
`AUTH_SECRET` (`src/lib/auth/sign.ts`). Purposes: `confirm` (48 hours) and
`leave` (180 days). A token for one purpose is refused for the other.

The confirm email (`waitlistConfirmMessage`) carries the confirm link, the
release page and the leave link. The pages `/waitlist/confirm` and
`/waitlist/leave` post the token only when the button is clicked, so a mail
scanner opening the link changes nothing. `POST /api/v1/waitlist/confirm` and
`POST /api/v1/waitlist/leave` take `{ token }`; an expired or wrong token
answers 422 on `token`. Confirming twice is harmless.

### Account → Waitlists

`/account/waitlists` lists the customer's entries: those linked to the
account, plus, for a verified account, those with its email. Each shows the
release, its opening and countdown, Confirmed or "Confirm from your email",
and the email and WhatsApp preferences, saved per entry. Turning WhatsApp off
clears the stored phone. **Leave** asks first.

### Admin

The release page's **Waitlist** panel lists entries, 50 a page (email,
preferences, phone, confirmed, joined). **Export CSV** fetches every page, 50
at a time, and builds the file in the browser with the shared report export
(`useExportReport`). A completed release has no entries left to list or
export, because its waitlist is deleted (section 13).

### API

| Route | Who | Purpose |
| --- | --- | --- |
| `POST /api/v1/releases/[slug]/waitlist` | Anyone | Join (above) |
| `POST /api/v1/waitlist/confirm` | Anyone with the link | Confirm; answers the release title and slug |
| `POST /api/v1/waitlist/leave` | Anyone with the link | Delete the entry |
| `GET /api/v1/account/waitlists` | Signed in | The customer's entries, paginated |
| `PATCH /api/v1/account/waitlists/[id]` | Signed in, owner | `{ emailOptIn, whatsappOptIn, phone }` |
| `DELETE /api/v1/account/waitlists/[id]` | Signed in, owner | Leave |
| `GET /api/v1/admin/releases/[id]/waitlist` | `PERMISSIONS.releases` View | The release's entries, paginated |

Hooks: `src/hooks/use-waitlist.ts` (`useJoinWaitlist`, `useConfirmWaitlist`,
`useLeaveWaitlist`, `useGetMyWaitlists`, `useUpdateMyWaitlist`,
`useDeleteMyWaitlist`) and, for the admin, `useGetReleaseWaitlist` and
`fetchAllReleaseWaitlist` in `src/hooks/use-release.ts`. Validators:
`src/validators/waitlist.validator.ts`.

---

## 13. Notification emails (#118)

Part 3. What a release's waitlist is sent, when, how staff set the times and
test the emails, and when the waitlist is deleted. How a message is claimed,
sent, retried and recorded belongs to the messaging module, so read
[MESSAGING.md](MESSAGING.md) with this section.

No migration came with this part. `Release.reminderOffsetsMinutes` and
`MessageLog` already existed.

### What the waitlist receives

| Email | When | Sent by |
| --- | --- | --- |
| Confirm link | A guest, an unverified account or another email joins (section 12) | `mailConfirmLink` in `waitlist.service.ts` |
| Welcome | The place is confirmed: the link is clicked, or a verified owner joins | `sendWaitlistWelcome` in `message-triggers.service.ts` |
| One per reminder time | Each saved number of minutes before the opening | `sweepReleaseSequence` in `release-message.service.ts` |
| Live | The opening, while the release has units to buy | `sweepReleaseSequence` |

1. A reminder time of one day or more is sent as a Countdown update, a
   shorter one as a Drop reminder. The wording and the name in the message
   log differ; the rule is `reminderTrigger` ([MESSAGING.md](MESSAGING.md)
   §2).
2. The welcome says when the release opens, or that it is already open.
3. Every one of these emails carries the release page and a signed leave link
   (section 12).
4. Back in stock and campaign messages also go to the waitlist. They are
   described in [MESSAGING.md](MESSAGING.md) §2.

### Reminder times per release

Each release keeps its own list of times, so two releases in the same week
can remind on different schedules.

1. **Names.** The API field is `reminders`, a list of whole minutes before
   the opening. The database column is `Release.reminderOffsetsMinutes`.
2. **Rules** (`reminderOffsetsValidator` in `release.validator.ts`): each
   value is from 1 to `RELEASE_REMINDER_MAX_MINUTES` (20,160, which is 14
   days), a release has at most `RELEASE_REMINDERS_MAX` (5) values, and no
   value appears twice. The list is saved largest first.
3. **The maximum is the sweep's window.** `RELEASE_REMINDER_MAX_MINUTES` is
   worked out from `RELEASE_REMINDER_LOOKAHEAD_DAYS`, how far ahead the sweep
   reads, so no saved time can fall outside what the sweep sees.
4. **An empty list means no reminders.** The welcome and the live email still
   go out.
5. **Create.** `createRelease` saves `reminders` when it is sent. Otherwise it
   saves `defaultReminderOffsets(isTestMode())` from `src/lib/releases.ts`:
   48 hours and 1 hour (`RELEASE_REMINDER_DEFAULTS_MINUTES`), or 10 and 5
   minutes in test mode (below).
6. **Update.** `updateRelease` keeps the saved list when `reminders` is left
   out of the `PUT`. A list that is sent is saved in Draft and Upcoming. In
   Live, Sold out and Completed a different list answers 422 on `reminders`
   (section 4). The same times in another order are not a change.
7. **Read.** `AdminReleaseDetail.reminders` returns the list largest first.
8. **Screen.** The **Reminders** field on the Details form of
   `/admin/releases/[id]`: one row per reminder, with a whole number and a
   unit dropdown (Minutes, Hours, Days), **Remove** on each row and **Add
   reminder** below, up to `RELEASE_REMINDERS_MAX` rows. The unit is only
   how staff type and read a time: the API and the database keep minutes.
   `toReminderRow` shows a saved time in the largest unit that fits exactly
   (2880 is 2 days, 90 stays 90 minutes) and `reminderRowMinutes` turns a
   row back into minutes; both are in `src/lib/releases.ts`. A line under
   the rows reads the times back in words. The field is locked with the
   other fields by `allowedEdits(status).reminders`. The create form does
   not show it, so a new release always starts with the defaults.

Example: `{ "reminders": [10080, 1440, 60] }` reminds one week, one day and
one hour before the opening.

### Timing

1. The timer in `src/instrumentation.ts` ticks every
   `RELEASE_SWEEP_INTERVAL_MS` (1 minute) and the release sequence runs on
   every tick, so an email leaves within about a minute of its time. The
   other timed messages run every 5 minutes ([MESSAGING.md](MESSAGING.md)
   §5).
2. A reminder is due from its time (`reminderDueAt`) until
   `MESSAGE_SCHEDULE_GRACE_MINUTES` (60) later (`isDue`). After that it is
   dropped, not sent late.
3. A reminder is never sent once the release has opened: the sweep reads
   reminders only for releases whose opening is still ahead.
4. Someone who confirms while a reminder is still due is sent it on the next
   tick.
5. The live email is due from the opening until the same grace has passed,
   and only while the release has not ended and has at least one available
   unit.
6. The sweep reads only releases that are published, not hidden, not
   completed and have a slug. A hidden release sends nothing.
7. A tick sends each message to at most `MESSAGE_SWEEP_BATCH` (50) people per
   release. The next tick carries on with whoever is left (section 11, item
   6, gives the ceiling this sets).

### Once only

Every send first claims a `MessageLog` row with a unique `dedupeKey`, so a
restart, a second server or two ticks at once can never send the same email
twice. The keys:

| Email | Key |
| --- | --- |
| Welcome | `WAITLIST_WELCOME:{entryId}:confirmed` |
| Reminder | `DROP_REMINDER:EMAIL:{releaseId}:{offset}:{opensAtMs}:{entryId}`, or the same with `COUNTDOWN_UPDATE` |
| Live | `DROP_LIVE:EMAIL:{releaseId}:{opensAtMs}:{entryId}` |

1. The opening time is part of the key. A release that is moved gets new
   keys, so its waitlist is reminded again for the new time.
2. A new reminder time is a new key, so adding one to an Upcoming release
   sends it once when it comes due.
3. A send that failed is tried again by later ticks, up to
   `MESSAGE_MAX_ATTEMPTS` (3), while the message is still due.
4. The confirm link email uses no key, because a guest may ask for it again.

### Who receives

1. Only entries that are confirmed (`confirmedAt` set) and have `emailOptIn`.
2. A confirmed entry with no email opt in gets no welcome; the message log
   records it as Skipped with the reason.
3. WhatsApp follows the same times for entries with the WhatsApp opt in and a
   phone. Until its credentials exist every WhatsApp message is recorded as
   Skipped ([MESSAGING.md](MESSAGING.md) §7).

### Waitlist deletion

The privacy policy says "Waitlist entries are deleted once the drop they
refer to has closed". This is the code that keeps that true.

1. `purgeEndedWaitlists(now)` in `waitlist.service.ts` deletes, in one
   `deleteMany`, every waitlist entry whose release is completed.
2. Completed is `completedWhere(now)` in `release.service.ts`, the same rule
   the Completed status and the list filter use: published, and `completedAt`
   set or `endsAt` at or before now. It covers a release whose end time
   passed and one closed with End release.
3. It is the last entry of `SWEEPS` in `message-scheduler.service.ts` and
   runs on the 5 minute cadence, so a waitlist is gone within about 5 minutes
   of the release completing. It logs one line with the count, only when it
   deleted something.
4. **The deletion is permanent.** A completed release can't be reopened
   (section 4), and its waitlist can't be restored, listed, exported or
   counted afterwards.
5. A Draft is never touched, so unpublishing an Upcoming release keeps its
   waitlist.
6. `MessageLog` is not touched. It keeps the recipient address of every
   message it recorded, so Marketing Messages and a customer's history still
   show what was sent.

### Test emails

`POST /api/v1/admin/releases/[id]/test-emails`, with no body, sends the
release's emails to the signed in admin's own address. It needs
`PERMISSIONS.releases` Edit and is limited by `RATE_LIMITS.releaseTestEmails`
(5 per 15 minutes per admin; over the limit answers 429 with `Retry-After`).

`sendReleaseTestEmails(releaseId, user)` in `release-message.service.ts`
sends, in this order:

1. the confirm link email,
2. the welcome,
3. one email per saved reminder time, with the wording that time gets,
4. the live email.

What to know:

1. Each subject starts with `RELEASE_TEST_EMAIL_SUBJECT_PREFIX` ("[Test] ").
2. It works in every status, Draft included, and needs no one on the
   waitlist. A release with no reminder times gets three emails.
3. It calls `sendEmail` directly and writes nothing to `MessageLog`. Test
   emails are not customer messages, so Marketing Messages stays a record of
   what customers were sent, and with no key every press sends again. This is
   the one deliberate exception to the "one door" rule in
   [MESSAGING.md](MESSAGING.md) §4 and §8.
4. The answer is `ReleaseTestEmailsResult`:
   `{ recipient, sent, logged, failed }`. `sent` went out over SMTP. `logged`
   only reached the server log, because email is in console mode. `failed`
   could not be sent; the error is in the server log.
5. When email is off the route answers 503 `NOT_CONFIGURED` ("Email isn't set
   up yet. Please try again later."). An unknown release answers 404.
6. The release page link is real. The confirm and leave links are signed for
   `RELEASE_TEST_ENTRY_ID`, an id no entry has, so they open the real pages
   and change nothing: confirming answers that the link has expired or is no
   longer valid, and leaving deletes nothing.
7. A reminder's "opens in" text comes from its saved time ("2 days", "1
   hour"), not from the clock, so the test shows what the waitlist will read.
8. Nothing is written to the Change Log, since nothing changes.

Screen: the **Emails** panel on `/admin/releases/[id]` lists what goes out
and when, and holds **Send test emails to me** for staff with Releases Edit.
Hook: `useSendReleaseTestEmails` in `src/hooks/use-release.ts`. Endpoint
path: `API_ENDPOINTS.admin.releases.testEmails(id)`.

### Test mode

`TEST_MODE=true` ([INTEGRATIONS.md](INTEGRATIONS.md) §3a) changes one thing
here: a release created while it is on starts with reminders 10 and 5 minutes
before the opening (`RELEASE_TEST_REMINDER_DEFAULTS_MINUTES`) instead of 48
hours and 1 hour.

1. Releases that already exist keep their times. Change them in the Reminders
   field.
2. The timer, the batch size and the number of emails a person gets are the
   same in every mode.
3. `isTestMode()` is read on the server, in `createRelease` and in the
   release page, which passes it down so the Emails panel can show "Test mode
   is on."
4. It belongs on staging only. Leave it out in production.

### Check every email in 10 minutes on staging

In test mode the reminders run 10 and 5 minutes before the opening, so the
whole sequence plays in 10 minutes.

1. Set `TEST_MODE=true` in the staging environment and redeploy. The server
   log shows `test mode: ON` next to the email transport line.
2. Create a release that opens about 12 minutes from now, which leaves 2
   minutes for the next steps. Give it an end time, allocate at least one
   unit, keep it not hidden, and publish it. The Reminders field shows 10
   and 5.
3. Join its waitlist from the storefront with an inbox you can read and the
   email opt in on. A verified, signed in customer is confirmed at once. A
   guest confirms from the email first.
4. Expect each of these once: the welcome straight after confirming, a
   reminder about 10 minutes before the opening, a second about 5 minutes
   before, and the live email at the opening. Each arrives within about a
   minute of its time.
5. A step done late is fine. A reminder still goes out for 60 minutes after
   its time, as long as the release has not opened.
6. Open Marketing, Marketing Messages (`/admin/marketing/messages`). It shows
   one row per email: Waitlist welcome, Drop reminder twice and Drop live,
   each Sent. A guest also has a row for the confirm link under Waitlist
   welcome. A Failed or Skipped row gives the reason.
7. Press End release. Within about 5 minutes the Waitlist panel is empty.

To read the wording without waiting, press **Send test emails to me** on the
release. Every email arrives at once, marked "[Test]".

### Copy

The FAQ answer to "When will I receive launch notifications?" in
`prisma/seed.ts` names the three default messages: 48 hours before, 1 hour
before and the moment it opens. The seed runs once on a new database
([COMMANDS.md](COMMANDS.md) §4), so on a database that already has content
change the answer in the FAQ editor. The answer describes the defaults; a
release with other reminder times does not match it.

---

## 14. Holds and checkout (#119)

Part 4. How customers buy a release's units: a cart line, a hold when
checkout opens, the per customer limit, the order, the payment deadline, and
where units go when they come back. The code is
`src/services/release-hold.service.ts`; the pure rules (`releaseOpenForSale`,
`releaseCapLeft`, `releaseCapMessage`, `holdCoversLines`, `paymentDeadline`)
are in `src/lib/releases.ts`. Read [CART.md](CART.md),
[ORDERS.md](ORDERS.md) and [PAYMENTS.md](PAYMENTS.md) with this section.

No migration came with this part. The tables and columns are from
`20261103095019_release_drops_expand` (section 2).

### Adding to the cart

`POST /api/v1/cart/items` with `releaseId` next to `variantId` adds a release
line ([CART.md](CART.md) §7). Guests can add; only signed in customers can
hold and check out. At sign in the guest's release line moves to the account
cart ([CART.md](CART.md) §6), and opening checkout holds it.

1. The variant must be allocated to that release and its product must not be
   in Trash. Shop visibility is not checked, because a release only product
   may be a Draft. Otherwise 404 "This item is no longer available."
2. The release must be Live, not hidden, and have a slug, else 409 "This
   release isn't open for sale."
3. Stock is the allocation's `available` plus the units this cart already
   holds, never the variant's shop stock. The usual quantity messages apply.
4. The limit: the cart's quantity of that release, over all its variants, may
   not pass `maxPerCustomer` less what the account already bought (the
   tally). 409 "You can buy up to {n} from this release." or "You've already
   bought as many as this release allows." A guest cart has no tally.
5. A cart has one line per variant. The same variant already on the cart from
   the shop, or from another release, answers 409 and says where it came
   from.
6. Price, add-ons and campaigns work as on a shop line.
7. Adding to, editing or removing a release line drops every hold on the
   cart (`releaseCartHolds`), so checkout holds again with the new lines.
   Editing a shop line leaves the hold alone.

Each cart line returns `release: { id, title, slug }`, or null for the shop.
A cart read marks a release line `RELEASE_CLOSED`, which blocks checkout,
when its release is gone, hidden, or neither Live nor Sold out; and
`UNAVAILABLE` when its product is in Trash.

### The hold

`POST /api/v1/checkout/hold` (signed in, no body) runs
`holdCart(userId, now)` in one transaction. It answers `CheckoutHold`,
`{ expiresAt }`, with `expiresAt` null when the cart has no release lines.

1. **When it starts.** When checkout opens, not when the item is added. A
   cart can sit for days without taking units.
2. **Length.** `StoreSettings.releaseHoldMinutes`, read when the hold is
   made. A change of the setting affects later holds only.
3. **Never extended on reload.** When every release line already has an
   unexpired `HELD` hold of the same quantity, the cart has no other hold,
   and every release is still Live or Sold out and not hidden, the call
   returns the existing expiry and changes nothing.
4. **One expiry per cart.** Otherwise the cart's old holds are released and
   new ones made, all with the same `expiresAt`. Two releases in one cart
   share one countdown.
5. **All or nothing.** Every release must be Live and not hidden, the cart
   must be within each release's limit, and each line takes its units only
   while `available` is at least the quantity, moving them from `available`
   to `reserved`. The first problem answers 409 on `cart` ("{release} is sold
   out.", "{release} isn't open for sale.", "Only {n} left of {product}.",
   "{product} is sold out." or the limit message) and the whole transaction
   rolls back. The old holds then stay as they were until they lapse.
6. **Editing a release line drops it** (above). Checkout then shows Hold
   again.
7. **Lapsing.** A hold past its `expiresAt` can't place an order. The timer
   releases it within a minute. Hold again releases it and holds again:
   before the timer runs the same units come straight back, after it only
   while they are still free.

### The limit per customer

`maxPerCustomer` counts units on orders, not in carts.

1. `ReleaseCustomerTally` holds what an account has on orders of a release
   that are not cancelled.
2. It is checked on add and on a raised quantity (the cart plus the tally),
   and on the hold (the cart's quantity per release against `maxPerCustomer`
   less the tally). It is enforced when the order is placed: the tally row
   is made at 0 when missing (`createMany` with `skipDuplicates`), then
   raised only where `quantity` is at most `maxPerCustomer` less the new
   units. A count of 0 answers 409 with the limit message, so two orders at
   once can never pass the limit.
3. A cancelled order takes its units off the tally.

### Placing the order

`placeInTransaction` ([ORDERS.md](ORDERS.md) §5) prices the cart first: a
`RELEASE_CLOSED` line blocks it there with "Some items in your cart changed.
Review your cart." Then `convertCartHolds` runs:

1. The releases of the cart's lines are locked. Each must still be Live or
   Sold out and not hidden, else 409 "{release} isn't open for sale." Sold
   out is allowed because the cart's own hold may have taken the last units.
2. Every release line needs an unexpired `HELD` hold of the same quantity,
   and the cart no other hold (`holdCoversLines`), else 409 "Your hold has
   ended. Hold again."
3. Each hold goes from `HELD` to `ORDERED`, guarded on still being
   unexpired. Each allocation moves the units from `reserved` to `sold`.
   Then the tally (above).
4. Shop lines take `ProductVariant.stock` as before; release lines don't.
5. The order is created with `releaseId` on each release line and the holds
   linked to it (`releaseHolds: { connect }` sets `ReleaseHold.orderId`).

Cash on delivery confirms at once as before, and its units stay sold.

### Paying by card or Apple Pay

A card or Apple Pay order with release lines gets
`Order.releaseHoldUntil = paymentDeadline(holdExpiresAt, placedAt)`: the
later of the earliest hold's end and the order time plus
`RELEASE_MIN_PAYMENT_MINUTES` (5). A customer who places the order with 30
seconds left still gets 5 minutes to pay. The hold is at most
`RELEASE_HOLD_MINUTES_MAX` (30 minutes, the life of a Stripe page), so the
deadline always falls inside the Stripe page's life.

The units count as sold from the moment the order is placed. Once the
deadline passes, `closeLapsedReleaseOrders(now)` in `payment.service.ts`
takes orders that are Awaiting payment, Unpaid and past `releaseHoldUntil`:

1. `closeOrderPayment(number)` closes the order's saved Stripe page, so it
   can no longer be paid ([PAYMENTS.md](PAYMENTS.md) §4).
2. If Stripe says the page completed, the payment is settled as usual and
   the order is not cancelled.
3. Otherwise `cancelLapsedOrder(number, sessionId)` cancels it, but only
   while it is still Awaiting payment, Unpaid, past its deadline and still
   holds the Stripe page just closed. A retried checkout that saved a new
   page in between is left for the next tick, which closes that page first.
4. The cancel has no actor and the note "Cancelled automatically: payment
   wasn't completed in time". It gives the units back (below) and sends the
   usual Cancelled email.

A failure on one order is logged and the next one is tried.

### Units coming back

Units come back when a hold is released (it lapsed, a cart edit dropped it,
or a new hold replaced it) or an order is cancelled, by staff or
automatically.

| From | While the release is open | Once it is completed |
| --- | --- | --- |
| A released hold | `reserved` to `available` | `reserved` to `returned`, plus the variant's shop stock |
| A cancelled order | `sold` to `available`, and off the tally | `sold` to `returned`, plus the variant's shop stock, and off the tally |

1. Each step first moves the hold's own status with a guarded `updateMany`
   (`HELD` or `ORDERED` to `RELEASED`) and moves counters only when that
   changed a row. Every counter change is a guarded `updateMany` too, so a
   step that runs twice moves nothing the second time.
2. Units back on `available` return a Sold out release to Live.
3. On a cancel, `releaseOrder` in `order.service.ts` gives shop lines back to
   `ProductVariant.stock` and release lines back through
   `releaseOrderHolds`, with every variant stock write in one pass.

### Completion

A release completes once. `completeRelease(tx, id, now)` sets `completedAt`
guarded on it being null, releases every `HELD` hold, and moves every
allocation's `available` units to `returned` and into the variant's shop
stock. Units on orders stay sold.

1. **End release** calls it in the same transaction as the end, so the units
   are back at once (section 5).
2. **The timer** runs `completeEndedReleases(now)`: published releases with
   `endsAt` passed and no `completedAt`, oldest end first, at most
   `RELEASE_COMPLETE_BATCH` (5) a tick, one transaction each.
3. A Draft is never completed.
4. An unpaid card order of a completed release keeps its units until it is
   paid or cancelled. Cancelled, they go to shop stock.

**On its first run against any database, the timer completes every published
release whose end has already passed and moves its unsold units into shop
stock. That write is permanent.**

### The stock sweeps

The first three entries of `SWEEPS` in `message-scheduler.service.ts`, each
with `everyTick: true`, so they run every minute before the message sweeps
([MESSAGING.md](MESSAGING.md) §5). A failure is logged and the next sweep
still runs.

| Sweep | Function | Each tick |
| --- | --- | --- |
| Expired release holds | `expireHolds` in `release-hold.service.ts` | Up to `RELEASE_HOLD_SWEEP_BATCH` (20) lapsed `HELD` holds, oldest first, released one release per transaction |
| Lapsed release orders | `closeLapsedReleaseOrders` in `payment.service.ts` | Up to `RELEASE_LAPSED_ORDER_BATCH` (10) orders past `releaseHoldUntil`, earliest deadline first |
| Ended releases | `completeEndedReleases` in `release-hold.service.ts` | Up to `RELEASE_COMPLETE_BATCH` (5) releases past `endsAt` |

The timer's running guard is per process. On several servers each runs the
sweeps, and the guarded updates keep every step to once.

### Lock order

Every transaction that moves release stock takes its row locks in this
order, so two of them queue instead of deadlocking:

1. the cart (`updatedAt` touched),
2. the order (its guarded status update),
3. the release rows, by id (`lockRelease` in
   `release-allocation.service.ts`, an `updateMany` of `updatedAt`),
4. holds, allocations and tallies, always written under their release row's
   lock,
5. product variants, every stock write in one pass by ascending id,
6. the coupon.

A transaction skips the steps it doesn't need. The release row lock is what
serialises holds, orders, cancels and completion of one release, so no unit
is ever held, sold or returned twice.

### The hold setting

`StoreSettings.releaseHoldMinutes` is one hold time for every release.

1. `GET /api/v1/admin/release-settings` (Releases View) answers
   `ReleaseSettingsView`: `{ releaseHoldMinutes, updatedAt }`. With no
   settings row it answers `RELEASE_HOLD_MINUTES_DEFAULT` (15) and
   `updatedAt: null`.
2. `PUT /api/v1/admin/release-settings` (Releases Edit) takes
   `{ releaseHoldMinutes }` (`releaseSettingsSchema`): a whole number from 1
   to `RELEASE_HOLD_MINUTES_MAX` (30), else 422 on the field. The change is
   recorded in the Change Log as "Release hold time" with the old and new
   minutes.
3. The maximum is the Stripe page's life, so the payment deadline never
   outlives the page.
4. Services: `getReleaseSettings`, `getReleaseHoldMinutes` and
   `updateReleaseSettings` in `store-settings.service.ts`. Hooks:
   `useGetReleaseSettings` and `useUpdateReleaseSettings` in
   `src/hooks/use-release.ts`. Path: `API_ENDPOINTS.admin.releaseSettings`.

### API

| Route | Who | Purpose |
| --- | --- | --- |
| `POST /api/v1/cart/items` | Anyone | With `releaseId`: add a release line (above) |
| `POST /api/v1/checkout/hold` | Signed in | Hold the cart's release lines; answers `{ expiresAt }` |
| `POST /api/v1/checkout` | Signed in | Place the order; release lines need the hold ([ORDERS.md](ORDERS.md) §5) |
| `GET /api/v1/admin/release-settings` | `PERMISSIONS.releases` View | The hold time |
| `PUT /api/v1/admin/release-settings` | `PERMISSIONS.releases` Edit | Change the hold time |

Hook: `useHoldCheckout` in `src/hooks/use-checkout.ts`. Path:
`API_ENDPOINTS.checkout.hold`.

### Screens

1. **`/releases/[slug]`**: while the release is Live, each variant with
   units left has **Add to cart** (the shared `AddToCartButton`, which sends
   `releaseId`).
2. **Cart**: a release line shows "From {release}", linked to the release
   page. A closed release reads "This release has closed. Remove it to
   continue."
3. **Checkout**: with release lines in the cart, checkout holds them once
   when it opens. A banner in the progress bar reads "Release items held for
   MM:SS" on all three steps. At zero, or when the hold fails, Place order is
   disabled and **Hold again** calls the hold again.
4. **`/admin/releases`**: the **Hold: N min** header button opens
   `ReleaseSettingsDialog` to change the hold time.

### Constants

In `src/lib/constants.ts`: `RELEASE_HOLD_MINUTES_DEFAULT` (15, when no
settings row exists), `RELEASE_HOLD_MINUTES_MAX` (30,
`CHECKOUT_PAYMENT_WINDOW_MINUTES`), `RELEASE_MIN_PAYMENT_MINUTES` (5),
`RELEASE_HOLD_SWEEP_BATCH` (20), `RELEASE_LAPSED_ORDER_BATCH` (10),
`RELEASE_COMPLETE_BATCH` (5).

### Tests

Pure rules only: the five rules above in `releases.test.ts`, `lineIssues`
with `RELEASE_CLOSED` and `planCartMerge` with release lines in
`cart-rules.test.ts`, `addCartItemSchema` with `releaseId` in
`cart.validator.test.ts`, `releaseSettingsSchema` in
`release.validator.test.ts`, and `sweepsDueOnTick` with the stock sweeps in
`messaging.test.ts`. The transactions and the concurrency are checked by
hand.

### Check holds in 10 minutes on staging

A short hold time lets the whole flow play out in about 10 minutes. Stripe
test keys must be set ([PAYMENTS.md](PAYMENTS.md) §8).

1. On `/admin/releases`, press **Hold: 15 min** and save 2 minutes.
2. Create a release that opens a minute from now and ends about 20 minutes
   from now, with a limit of 2, and allocate 3 units of one variant that has
   them in stock. Publish it and wait until it is Live.
3. As customer A, signed in, add 2 from the release page. The cart line
   shows "From {release}". Raising it to 3 answers "You can buy up to 2 from
   this release."
4. Open checkout. The banner counts down from 2:00, and the release page in
   the admin shows reserved 2. Reload checkout: the countdown carries on and
   does not restart.
5. Let it reach zero. Place order is disabled and Hold again shows. Within a
   minute the admin shows reserved 0 again. Press Hold again for a new
   countdown.
6. Place the order with cash on delivery. The admin shows sold 2. Adding
   another answers "You've already bought as many as this release allows."
7. As customer B, add the last unit, pay by card, and leave the Stripe page
   without paying. Within a minute of the deadline, about 5 minutes after
   placing it, the order is Cancelled with the note "Cancelled
   automatically: payment wasn't completed in time", the Cancelled email
   arrives, the Stripe page can no longer be paid, and the unit is back on
   available.
8. Meanwhile, cancel customer A's order on the admin Orders screen. Sold
   drops by 2, available rises by 2, and A can add again.
9. Press End release. Available drops to 0, returned shows the units, and
   the variant's in stock rises by the same number at once.
10. Set the hold time back to 15 minutes.
