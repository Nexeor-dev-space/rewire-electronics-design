# Cart, Pricing, Coupons and Delivery

How the server cart works, how it is priced, how discount codes and delivery
zones are set up in the admin, and what the storefront reads. Built in Phase 4.

Read this before you change the cart API, `src/lib/pricing/`, a coupon or
delivery zone rule, the checkout steps, or any screen that shows cart lines or
totals.
[DATA-LAYER.md](DATA-LAYER.md) covers the general conventions; this document
covers what is specific to the cart.

---

## 1. What this module covers

| Area | What exists |
| --- | --- |
| Pricing | `priceCart` and `evaluateCoupon` in `src/lib/pricing/`: pure, client safe, tested with Vitest |
| Database | `Cart`, `CartItem`, `CartItemAddOn`, `Coupon`, `CouponProduct`, `CouponCategory`, `DeliveryZone` |
| Admin | Marketing → **Discount Codes** (`/admin/marketing/coupons`) and Governance → **Delivery Zones** (`/admin/settings/delivery`) |
| Cart API | `/api/v1/cart`, `cart/items`, `cart/items/[id]`, `cart/coupon`, `cart/acknowledge`, `cart/quote` |
| Storefront | Header count, cart page, add to cart modal, product page buy panel, card Add to cart, checkout summary and the checkout steps |

Checkout itself (orders, payment, stock deduction, redemption counting) is
Phase 5. Section 13 lists what Phase 5 must do with this module.

---

## 2. Data model

Three schema files, one migration: `add_cart_coupon_delivery_zone`.

| File | Models |
| --- | --- |
| `prisma/schema/cart.prisma` | `Cart`, `CartItem`, `CartItemAddOn` |
| `prisma/schema/coupon.prisma` | `CouponType` enum (`PERCENT`, `FIXED`), `Coupon`, `CouponProduct`, `CouponCategory` |
| `prisma/schema/delivery.prisma` | `DeliveryZone` |

Back relations only (no column changes) were added to `User` (`cart`),
`ProductVariant` (`cartItems`), `AddOn` (`cartItems`), `Product` (`coupons`)
and `Category` (`coupons`).

The schema files carry no comments. These facts are the ones a reader cannot
see from the columns alone:

1. **One cart per owner.** A cart belongs to a user (`userId`, unique) or to a
   guest browser (`guestTokenHash`, unique), never both. Because `userId` is
   unique, concurrent first adds cannot create two carts for one customer.
2. **The guest token is stored hashed.** `guestTokenHash` is the SHA-256 of
   the raw token in the `rewire_cart` cookie (`hashToken` from
   `src/lib/auth/tokens.ts`). A database leak does not hand out live carts.
3. **One line per variant.** `@@unique([cartId, variantId])`. Add-ons are a set
   on the line (`CartItemAddOn`, keyed on line and add-on). Adding the same
   variant again adds to its quantity and unions the add-on set.
4. **Seen prices.** `CartItem.seenUnitPrice` and `CartItemAddOn.seenPrice` hold
   the price the shopper last saw. They drive the `PRICE_CHANGED` flag
   (section 7); they are not what the shopper pays. The live price is always
   charged.
5. **Deletes cascade.** Deleting a variant or an add-on removes it from every
   cart silently. Deleting a user deletes their cart. Deleting a coupon sets
   `Cart.couponId` to null (`SetNull`).
6. **`Cart.updatedAt` is set explicitly** on every item mutation, because
   changing a child row does not touch the parent. The stale guest sweep reads
   it (section 8.3).
7. **Coupon codes are stored trimmed and uppercased.** The validator does
   this, so `summer10` and `SUMMER10` are the same code. `code` is unique.
8. **`Coupon.value`** is a whole percent (1 to 100) for `PERCENT` and fils for
   `FIXED`.
9. **`Coupon.appliesToAll`** follows the same pattern as `AddOn.appliesToAll`.
   False means only the listed products and categories. The flag exists so a
   restricted coupon cannot silently become store wide when its last product
   is deleted and the join row cascades away.
10. **`Coupon.redemptionCount`** is never written by the admin form. Phase 5
    checkout increments it with a guarded `updateMany` (`where redemptionCount
    < usageLimit`), so the usage limit cannot be overshot. Until then it stays
    0.
11. **The cart is emptied at checkout**, not marked converted. Phase 5 deletes
    the items and clears `couponId` in the order transaction, which is what
    lets `userId` stay unique with no status column.
12. **`DeliveryZone`** is one row per `Emirate` (unique). Fees are fils; the
    four `*Days` columns are working days.
13. **Indexes worth knowing:** `Cart.updatedAt` (stale guest sweep),
    `Cart.couponId` (an extra index so the `SetNull` on coupon delete does not
    scan carts), `CartItem.variantId` and `CartItemAddOn.addOnId` (cascades),
    `Coupon(active, endsAt)` and `Coupon.updatedAt` (admin list).

---

## 3. Pricing

`src/lib/pricing/`. Pure TypeScript with no Prisma and no clock: the caller
passes `now`. Safe to import on the client. Money is `Int` fils everywhere.

| File | Exports |
| --- | --- |
| `types.ts` | `PricingLine`, `CouponRule`, `CouponContext`, `CouponResult`, `CouponRejection`, `CouponStatus`, `PriceCartInput`, `CartPricing` |
| `arithmetic.ts` | `PERCENT_BASE` (100), `lineTotal`, `assertMinorUnits` |
| `coupon.ts` | `evaluateCoupon`, `isLineEligible`, `couponStatus`, `COUPON_MESSAGES`, `COUPON_MINIMUM_TOKEN` |
| `price-cart.ts` | `priceCart`, `vatIncludedIn` |

`priceCart({ lines, coupon, deliveryFee, now })` returns:

| Figure | Rule |
| --- | --- |
| `lines[].lineTotal` | `(unitPrice + addOnUnitPrice) × quantity`, for every line, purchasable or not |
| `subtotal` | Sum of `lineTotal` over purchasable lines only |
| `discount` | The coupon discount when `evaluateCoupon` is ok, otherwise 0. Never above the eligible subtotal |
| `delivery` | `null` when no fee was passed; 0 when the subtotal is 0; otherwise the fee |
| `total` | `subtotal − discount + delivery` |
| `vatIncluded` | `round(total × 5 / 105)` |
| `vatRatePercent` | `VAT_RATE_PERCENT` (5) |
| `coupon` | The raw `CouponResult`, or null when no coupon was passed |

The rules behind these figures:

1. **Add-ons are charged per unit.** Two phones with a 24 month extension pay
   for two extensions. `addOnUnitPrice` is the sum of the line's *available*
   add-on prices; an add-on that is no longer offered is shown but not
   charged.
2. **Unpurchasable lines are shown, not priced.** A line whose product is
   unavailable or whose variant has no stock keeps its `lineTotal` for display
   but is left out of the subtotal and of coupon eligibility. A line with
   `INSUFFICIENT_STOCK` is priced at the quantity asked for.
3. **VAT is included, never added.** Prices are VAT inclusive; `vatIncluded`
   is the part of the total that is VAT, computed once on the rounded total.
   Delivery is inside the VAT base. The rate is a server constant, not a
   setting: the admin "VAT & Configuration" row stays a placeholder.
4. **Bad input throws.** A negative or fractional price, fee or quantity
   throws a plain `Error`. That is a caller bug, not a shopper error.

---

## 4. Coupons

### 4.1 Evaluation order

`evaluateCoupon(rule, { lines, subtotal, customerRedemptions, now })` runs
these checks in order. The first failure wins.

| # | Check | Result | Shopper message |
| --- | --- | --- | --- |
| 1 | `active` is false | `DISABLED` | That code isn't valid. |
| 2 | `startsAt` set and `now < startsAt` | `NOT_STARTED` | This code isn't active yet. |
| 3 | `endsAt` set and `now >= endsAt` | `EXPIRED` | This code has expired. |
| 4 | `usageLimit` set and `redemptionCount >= usageLimit` | `USAGE_LIMIT_REACHED` | This code has been fully redeemed. |
| 5 | `perCustomerLimit` set and `customerRedemptions >= perCustomerLimit` | `CUSTOMER_LIMIT_REACHED` | You've already used this code. |
| 6 | No purchasable line is eligible | `NOT_APPLICABLE` | This code doesn't apply to the items in your cart. |
| 7 | Whole cart `subtotal < minOrderAmount` | `MINIMUM_NOT_MET` | Spend at least {minimum} to use this code. |
| 8 | Otherwise | ok | |

Two outcomes come from the service, not the pure function: an unknown code
is `INVALID` ("That code isn't valid.", the same text as `DISABLED`, so a
disabled code cannot be told apart from a made up one), and a guest is
`SIGN_IN_REQUIRED` ("Sign in to use a discount code."). The service fills
`{minimum}` with `formatMoney(minOrderAmount)`.

### 4.2 What is discounted

1. **Eligibility.** A line is eligible when the coupon `appliesToAll`, or
   lists the line's product, or lists the line's category or that category's
   parent. A parent category therefore covers its children.
2. **Minimum on the whole cart.** Check 7 compares the whole purchasable
   subtotal, not just the eligible lines, with `minOrderAmount`.
3. **Discount on eligible lines, add-ons included.** The eligible subtotal is
   the sum of eligible purchasable `lineTotal`s, add-ons included.
   `PERCENT`: `round(eligibleSubtotal × value / 100)`. `FIXED`:
   `min(value, eligibleSubtotal)`. The discount never exceeds the eligible
   subtotal, so a total can reach delivery but never go below it.
4. **Boundaries.** `now == startsAt` is live; `now == endsAt` is expired;
   `redemptionCount == usageLimit` is used up; `subtotal == minOrderAmount`
   qualifies.

### 4.3 Coupons on a cart

1. **Signed in only.** Guests never have a coupon. `Cart.couponsAllowed` is
   true only with a session, and the checkout hides the field otherwise.
2. **Applying** (`POST cart/coupon`) prices the cart with the code and attaches
   it only when the result is ok. Any rejection answers 422 with the message
   on `fields.code`, and nothing is attached.
3. **An attached coupon that stops qualifying** (expired, cart fell below the
   minimum, the eligible product was removed) stays attached. The cart
   returns `coupon.valid: false` with its message and a discount of 0. Reads
   never detach it; the customer removes it, or it qualifies again.
4. **Per customer limits count as 0** until Phase 5, because there are no
   orders to count (`CUSTOMER_REDEMPTIONS_BEFORE_ORDERS` in
   `cart.service.ts`). A `perCustomerLimit` is stored and validated but cannot
   reject anyone yet.
5. **Merge on sign-in** keeps the user cart's own coupon (section 8.2).

### 4.4 Admin status badge

`couponStatus(rule, now)` reuses checks 1 to 4: `DISABLED`, `SCHEDULED`,
`EXPIRED`, `USED_UP`, otherwise `ACTIVE`. The admin list shows it as a badge;
the API returns it as `AdminCoupon.status`.

---

## 5. Delivery zones

1. **One row per emirate**, seven in total, bounded by the `Emirate` enum.
   Each row has a standard and an express fee (fils) and an earliest and latest
   working day for each.
2. **Methods** are the TypeScript constant `DELIVERY_METHODS` (`STANDARD`,
   `EXPRESS`) in `src/lib/delivery.ts`, with `DELIVERY_METHOD_LABELS`. There
   is no database enum yet; it arrives with `Order` in Phase 5. "Collect in
   Dubai" from the old mock checkout was dropped until pickup is specified.
3. **`formatEta(min, max)`** in `src/lib/delivery.ts` is the one formatter:
   "Same working day" when the latest day is 0, "Next working day" when both
   are 1, "3 working days" when both are equal, otherwise "2 to 4 working
   days". The admin preview and the checkout use it.
4. **A missing row** means the emirate is not delivered to: the quote answers
   404 "We don't deliver to that emirate yet." The admin list still shows all
   seven, the missing ones as "Not set".
5. **Seed.** `prisma/seed-delivery-zones.ts` (`seedDeliveryZones`, called from
   `prisma/seed.ts`) creates only the missing emirates, with `update: {}`, so
   rerunning it never overwrites an admin edit. Defaults: standard free, 2 to 4
   working days; express AED 35 (3500 fils), 1 to 2 working days.

**Warning:** `npm run db:seed` runs every seed, not just this one. It also
rewrites every policy page and the whole homepage (draft and live), resets the
seeded Admin's password to `SEED_ADMIN_PASSWORD`, and upserts the sample
catalogue. On a database with real edits, do not run it just to add delivery
zones; set them on the Delivery Zones screen instead.

---

## 6. Admin

| Screen | Route | Permission | Component |
| --- | --- | --- | --- |
| Discount Codes | `/admin/marketing/coupons` | `PERMISSIONS.coupons` (`marketing.coupons`) | `src/components/admin/coupons/coupon-management.tsx`, `coupon-form-modal.tsx` |
| Delivery Zones | `/admin/settings/delivery` | `PERMISSIONS.deliveryZones` (`governance.delivery`) | `src/components/admin/delivery-zones/delivery-zone-management.tsx` |

Admins hold both; Staff hold them through their Staff role
([PERMISSIONS.md](PERMISSIONS.md)). Every route starts with
`authorizeApi` (401 / 403), validates with Zod (422 `VALIDATION` with
`fields`), and fails through `apiErrorFrom`.

| Endpoint | Method | Input | Success | Errors |
| --- | --- | --- | --- | --- |
| `/api/v1/admin/coupons` | `GET` | `couponListQuerySchema`: `page`, `pageSize`, `search` (code, contains, any case), `active` (`true` / `false`) | 200 `Paginated<AdminCoupon>`, newest `updatedAt` first | 422 |
| `/api/v1/admin/coupons` | `POST` | `couponSchema` | 201 `AdminCoupon` | 409 on `code`; 422, including a product or category that no longer exists |
| `/api/v1/admin/coupons/[id]` | `GET` | | 200 `AdminCoupon` | 404 |
| `/api/v1/admin/coupons/[id]` | `PUT` | `couponSchema` | 200 `AdminCoupon` | 404, 409 on `code`, 422 |
| `/api/v1/admin/coupons/[id]` | `DELETE` | | 200 `{ id }` | 404 |
| `/api/v1/admin/delivery-zones` | `GET` | | 200 `DeliveryZoneRow[]`, always 7, in `EMIRATES` order | |
| `/api/v1/admin/delivery-zones/[emirate]` | `PUT` | `deliveryZoneSchema` | 200 `DeliveryZoneRow` (upsert) | 404 unknown emirate, 422 |

Coupon form rules (`src/validators/coupon.validator.ts`):

1. Code: 3 to 32 characters, letters, numbers, hyphens and underscores,
   uppercased. A clash is 409 "That code is already in use." on `code`.
2. Value: a whole number from 1. For `PERCENT`, at most 100. The form takes a
   percent or an AED amount and converts AED with `toMinorUnits`.
3. Minimum order: fils, default 0. Description: up to 160 characters.
4. Start and end are optional ISO date times; the end must be after the start.
5. Usage limit and per customer limit are optional, at least 1 when set.
6. "Applies to every product" off needs at least one product or category, up
   to `MAX_COUPON_TARGETS` (50) of each. Targets are ignored when it is on.
   Join rows are replaced on every save.
7. Deleting a coupon removes it from carts that held it. Phase 5 will refuse
   to delete a coupon with redemptions ("Disable it instead").

Delivery zone form rules (`src/validators/delivery-zone.validator.ts`): fees 0
or more; days whole numbers from 0 to `MAX_DELIVERY_DAYS` (30); the latest day
not before the earliest, reported on the `*MaxDays` field. There is no create
or delete: the seven rows are fixed.

Files: `src/services/coupon.service.ts`, `delivery-zone.service.ts`;
`src/types/coupon.ts` (`AdminCoupon`, `CouponFilters`, `CouponInput`),
`src/types/delivery.ts` (`DeliveryZoneRow`, `DeliveryZoneInput`);
`src/hooks/use-coupon.ts`, `use-delivery-zone.ts`. `useGetCoupon` uses
`gcTime: 0`, like `useGetProduct`.

---

## 7. Cart API

Every route returns through `apiSuccess` / `apiError` / `apiErrorFrom` and may
answer 500 `INTERNAL`. Only `cart/coupon` needs a session. Every read and every
mutation response re-prices from the database: current variant price, stock,
product status, category visibility, add-on status and applicability, and the
coupon. Mutations answer with the whole fresh `Cart`.

| Endpoint | Method | Session | Input | Success |
| --- | --- | --- | --- | --- |
| `/api/v1/cart` | `GET` | optional | | 200 `Cart` |
| `/api/v1/cart/items` | `POST` | optional | `addCartItemSchema`: `variantId`, `quantity` (1 to 5, default 1), `addOnIds` (default `[]`) | 201 `Cart` |
| `/api/v1/cart/items/[id]` | `PATCH` | optional | `updateCartItemSchema`: `quantity` and/or `addOnIds` (the full new set) | 200 `Cart` |
| `/api/v1/cart/items/[id]` | `DELETE` | optional | | 200 `Cart` |
| `/api/v1/cart/coupon` | `POST` | **required** | `applyCouponSchema`: `code` | 200 `Cart` |
| `/api/v1/cart/coupon` | `DELETE` | **required** | | 200 `Cart` |
| `/api/v1/cart/acknowledge` | `POST` | optional | | 200 `Cart` |
| `/api/v1/cart/quote` | `GET` | optional | `cartQuoteQuerySchema`: `emirate`, `method` (default `STANDARD`) | 200 `CartQuote` |

Errors by route:

1. **GET cart.** None beyond 500. With no session and no cookie it returns the
   empty cart with no database query. An invalid cookie, or one whose cart no
   longer exists, is treated as no cart and cleared. It never creates a row.
2. **POST cart/items.**
   1. 429 `RATE_LIMITED` (`RATE_LIMITS.guestCart`, 10 per hour per IP) when
      there is no session and no valid cookie, that is, when the request would
      create a new guest cart.
   2. 422 on the body.
   3. 404 "This item is no longer available." for an unknown variant, a
      product that is not published, or a hidden category.
   4. 422 on `addOnIds` "One of the chosen add-ons isn't available for this
      item." when an add-on is inactive or not among the product's offered
      add-ons (the same top `MAX_PRODUCT_ADD_ONS` the product page shows).
   5. 409 `CONFLICT` on `quantity`: "Only {n} left in stock.", "This item is
      out of stock.", "You can add up to 5 of this item.", or "Your cart is
      full." at `CART_MAX_LINES` lines.
   On first add a guest gets a new cart and the `rewire_cart` cookie. Adding a
   variant already on the cart adds to its quantity, unions the add-ons and
   refreshes the line's seen prices.
3. **PATCH cart/items/[id].** 404 "That item isn't in your cart." when the
   line is not in the caller's cart (the ownership check, the same answer as a
   missing id); 422 on the body ("Nothing to update." when both fields are
   missing); 409 as above when *raising* the quantity; 422 on `addOnIds` as
   above. Lowering a quantity is always allowed, even on a blocked line. Any
   edit refreshes that line's seen prices, clearing its `PRICE_CHANGED`.
4. **DELETE cart/items/[id].** 404 as above.
5. **POST cart/coupon.** 401 `UNAUTHENTICATED` "Sign in to use a discount
   code."; 429 (`RATE_LIMITS.applyCoupon`, 10 per 10 minutes per user); 422
   on the body; 409 "Add something to your cart first." for an empty cart; 422
   with the section 4.1 message on `fields.code` for an unknown or rejected
   code.
6. **DELETE cart/coupon.** 401 as above.
7. **POST cart/acknowledge.** None. Sets every seen price to the current one,
   clearing `PRICE_CHANGED` on all lines.
8. **GET cart/quote.** 422 on `emirate` / `method`; 404 "We don't deliver to
   that emirate yet." when the zone row is missing. `options` holds both
   methods for the emirate; `cart.totals.delivery` is the chosen method's fee.

### 7.1 Response shape

Types in `src/types/cart.ts`.

1. `Cart`: `id` (null when no row exists yet), `items` (newest first, at most
   `CART_MAX_LINES`), `itemCount` (sum of quantities over every line, flagged
   ones included), `coupon` (`AppliedCoupon` or null), `totals` (`CartTotals`),
   `canCheckout` (at least one line and no blocking issue), `couponsAllowed`.
2. `CartLine`: ids, product slug, name and brand, `imageUrl` (the first image
   tagged with the variant colour, else the first untagged, else the first),
   condition, grade, storage, colour, `quantity`, `maxQuantity`
   (`min(stock, CART_MAX_LINE_QUANTITY)`), `unitPrice`, `compareAtPrice`,
   `previousUnitPrice` (the seen price when the variant price changed),
   `addOns` (chosen, each with `available`), `offeredAddOns` (what the row may
   offer, the same rule as the product page), `lineTotal`, `issues`.
3. `AppliedCoupon`: `code`, `description`, `valid`, `message`.
4. `CartTotals`: `subtotal`, `discount`, `delivery` (null outside a quote),
   `total`, `vatIncluded`, `vatRatePercent`.
5. `CartQuote`: `cart`, `emirate`, `method`, `options` (`DeliveryOption[]`:
   `method`, `label`, `fee`, `etaMinDays`, `etaMaxDays`).

### 7.2 Line issues

Computed by `lineIssues` in `src/lib/cart-rules.ts`. At most one of the first
three applies.

| Issue | When | Blocks checkout | Priced |
| --- | --- | --- | --- |
| `UNAVAILABLE` | Product not published, or its category (or parent) hidden | yes | no |
| `OUT_OF_STOCK` | Variant stock is 0 | yes | no |
| `INSUFFICIENT_STOCK` | Stock is above 0 but below the quantity | yes | yes, at the quantity asked |
| `PRICE_CHANGED` | The variant price, or an available chosen add-on's price, differs from the seen price | no | yes, at the current price |
| `ADD_ON_UNAVAILABLE` | A chosen add-on is inactive or no longer offered on the product | no | the add-on is not charged |

Blocking lines stay in the cart until the shopper removes them, so items
never disappear silently from a cart they built. The blocking set is
`BLOCKING_CART_LINE_ISSUES` in `src/types/cart.ts`.

### 7.3 Server files

| File | Role |
| --- | --- |
| `src/services/cart.service.ts` | `getCart`, `quoteCart`, `addCartItem`, `updateCartItem`, `removeCartItem`, `acknowledgeCart`, `applyCartCoupon`, `removeCartCoupon`, `adoptGuestCart` |
| `src/lib/cart-owner.ts` | `CartOwner`, `resolveCartOwner`, `readGuestTokenHash`, `setGuestCartCookie`, `clearGuestCartCookie` |
| `src/lib/cart-rules.ts` | Pure rules, unit tested: `isProductVisible`, `lineIssues`, `maxLineQuantity`, `quantityProblem`, `unionIds`, `pickLineImage`, `planCartMerge` |
| `src/lib/auth/sign.ts` | `sign`, `signed`, `verifySigned`: HMAC-SHA256 with `AUTH_SECRET`, shared by the session and cart cookies |
| `src/validators/cart.validator.ts` | The four schemas above plus `cartItemParamsSchema` |

The cart reuses the catalogue's exported rules instead of copying them:
`PUBLISHED`, `offeredAddOnWhere`, `OFFERED_ADD_ON_ORDER`, `shopAddOnSelect` and
`toShopAddOn` from `src/services/catalogue.service.ts` (see
[CATALOGUE.md](CATALOGUE.md) §3).

### 7.4 Cost per request

1. Signed out with no cookie (crawlers included): no query, so the header
   count is free for them.
2. A cart read is one query for the cart with lines, variants, products,
   category visibility, images, chosen add-ons and coupon, plus one for the
   offered add-ons across all lines. Bounded by `CART_MAX_LINES`.
3. A quote adds one lookup on `delivery_zones`.
4. No stock is reserved. Stock is only taken at checkout (Phase 5).

---

## 8. Guest cookie and merge

### 8.1 The cookie

1. Name `rewire_cart`. Value `<rawToken>.<hmac>`: the token from
   `createRandomToken()` (32 random bytes, base64url), signed with
   `AUTH_SECRET`. No new env var.
2. httpOnly, Secure in production, SameSite Lax, path `/`, max age
   `CART_COOKIE_MAX_AGE_SECONDS` (30 days), set once when the guest cart is
   created and not extended.
3. The cart is looked up by `guestTokenHash = hashToken(rawToken)`. A bad
   signature or an unknown hash means no cart.
4. Ignored whenever a session exists: a signed in caller always works on the
   user cart.

### 8.2 Merge on sign-in

`adoptGuestCart(userId)` runs right after the session starts, after sign-in
(`auth/sign-in`, any role) and after sign-up (`auth/sign-up`). It is not
inside `startSession`, so `session.ts` stays free of cart code. It catches and logs its own errors and
never fails the sign-in; on failure the cookie is kept so the next sign-in
retries.

In one transaction:

1. No valid cookie, or no cart for its hash: nothing to merge.
2. The user has no cart: the guest cart becomes theirs (`userId` set, token
   hash cleared).
3. The user has a cart: guest lines, newest first, are planned by
   `planCartMerge`:
   1. The same variant is already on the user cart: quantity becomes
      `min(sum, CART_MAX_LINE_QUANTITY)`, new add-ons are added (with the
      guest's seen prices), the user line keeps its own seen price.
   2. Otherwise the line moves to the user cart with its seen prices, while
      the user cart has fewer than `CART_MAX_LINES` lines. Lines past the cap
      are dropped.
   Then the guest cart is deleted. The user's coupon stays and is re-evaluated
   on the next read.
4. The cookie is cleared.

Stock is not checked during the merge; the next read flags it. Sign-in,
sign-up and sign-out all call `queryClient.clear()` on the client, so the
merged cart loads on the next render. Sign-out does not touch carts: the user
cart stays on the account and the browser starts a fresh guest cart on its
next add.

### 8.3 Stale guest carts

Guest carts older than `CART_COOKIE_MAX_AGE_SECONDS` (by `updatedAt`) are
deleted each time a new guest cart is created, in one `deleteMany` on the
`updatedAt` index, like the media sweep. No timer and no job. User carts are
never swept.

---

## 9. Storefront

All cart data comes from `src/hooks/use-cart.ts`. `AccountProvider` no longer
holds the cart; it keeps only the wishlist. Carts saved in localStorage by the
old mock are abandoned: they held mock slugs with no database variant.

| Hook | Calls |
| --- | --- |
| `useGetCart()` | `GET cart` |
| `useGetCartQuote(emirate, method)` | `GET cart/quote`, enabled once an emirate is set |
| `useAddCartItem()` | `POST cart/items` |
| `useUpdateCartItem()` | `PATCH cart/items/[id]` |
| `useRemoveCartItem()` | `DELETE cart/items/[id]` |
| `useApplyCoupon()` | `POST cart/coupon`, with `meta: { authRedirect: false }` so a 401 shows as a message, not a redirect |
| `useRemoveCoupon()` | `DELETE cart/coupon` |
| `useAcknowledgeCart()` | `POST cart/acknowledge` |

Every mutation writes the returned cart straight into the cache
(`setQueryData`) and invalidates the quotes, instead of invalidating the cart
(see [DATA-LAYER.md](DATA-LAYER.md) §6).

| Surface | File | Reads |
| --- | --- | --- |
| Header count | `components/layout/cart-button.tsx` | `useGetCart().itemCount`, hidden while pending |
| Cart page | `components/cart/cart-view.tsx`, `cart-line.tsx`, `cart-summary.tsx` | `useGetCart`. Line issues on each row; a "price changed" notice with "Got it" (`useAcknowledgeCart`); add-on chips from `offeredAddOns`, plus any chosen add-on no longer offered so it can be removed; Proceed to checkout disabled with "Remove unavailable items to continue." when `!canCheckout`. Delivery reads "Calculated at checkout" |
| Add to cart modal | `components/cart/add-to-cart-modal.tsx`, `cart-feedback-provider.tsx` | Opens after a product page add. Item count and subtotal from `useGetCart`; the confirmation from the returned line. The cross sell rail still comes from the mock catalogue and links to product pages |
| Product page | `components/product/detail/product-buy-panel.tsx` | The line for the selected variant; Add to cart sends the selected add-ons; the stepper (`components/cart/quantity-stepper.tsx`) updates or removes the line; the maximum is the line's `maxQuantity`, or `min(stock, CART_MAX_LINE_QUANTITY)` before a line exists. While `useGetCart` is still pending, the slot shows a same-size skeleton rather than guessing button or stepper; an error falls back to the button |
| Product card | `components/product/add-to-cart-button.tsx` | Adds `ShopCard.variantId` with no add-ons; once that variant is a line the card shows the same stepper (`size="md"`), sharing the one `useGetCart` cache with every other card; a skeleton fills the slot while pending. A card without a variant id (mock data) links to the product page as "View & Buy" |
| Home setup kit, drop cards | `components/home/setup/setup.tsx`, `components/home/upcoming-drops/drop-card.tsx` | No cart call: they link to the product page |
| Checkout | `components/checkout/checkout-view.tsx`, `checkout-section.tsx`, `checkout-progress.tsx`, `field.tsx`, `option-list.tsx`, `order-summary.tsx`; `src/validators/checkout.validator.ts` | Lines, totals, coupon and delivery options all from `useGetCartQuote(emirate, method)`, default Dubai and Standard. Emirates from `EMIRATES`. The coupon field shows only when `couponsAllowed`; Enter in it applies the code. VAT reads "Includes VAT 5%". The steps are in §9.1 |

Placing an order is still the mock: it stores a `PlacedOrder` in localStorage
(`src/lib/checkout.ts`) for the success page and **no longer empties the
cart**. Real orders replace it in Phase 5.

### 9.1 Checkout steps

`/checkout` is a four step accordion: **01 Information** (contact and
address), **02 Delivery** (method), **03 Payment**, **04 Review**. The order
summary sits beside it from `lg`, and above it on smaller screens.

1. **Strictly linear.** One step is open at a time (`openStep` in
   `checkout-view.tsx`). Steps before it are done, steps after it are locked
   and show only their title. A step opens only through the Continue button
   of the step before it.
2. **Done steps collapse to a summary with Edit.** Information shows email,
   phone and "city, emirate"; Delivery shows method, ETA and fee; Payment shows
   the method. Edit reopens that step and locks every step after it again, so
   the shopper continues through each once more. Edit does nothing while an
   order is being placed.
3. **Bodies stay mounted.** `CheckoutSection` collapses a closed body to zero
   height with the shared `collapsePanel` / `collapsePanelBody` variants and
   marks it `inert`, so it cannot be tabbed into. The inputs keep their values,
   and Place Order reads the whole form with `FormData`.
4. **Focus and scroll.** Opening a step moves focus to its heading. When the
   open animation ends, the section scrolls to the top of the viewport
   (instantly under reduced motion); its `scroll-mt-*` clears the header and
   the progress bar.
5. **Enter** in a field continues the open step, or places the order on
   Review.
6. **Progress bar.** `CheckoutProgress` sits in a sticky bar just below the
   checkout header (`top-16`, `md:top-20`). From `sm` it shows four pills: the
   open one carries `aria-current="step"`, and done pills are buttons that
   reopen their step, the same as Edit. Below `sm` it compacts to "Step X of
   4" and the step name, with no buttons; Edit on each section does the job.
7. **Place Order waits for every step.** `OrderSummary` takes `stepsComplete`
   (true only while Review is open) and keeps Place Order disabled until then,
   with "Complete each step to place your order." under it. The mobile sticky
   bar is disabled on the same condition, and `handlePlaceOrder` checks it
   again.

**Information is validated with `checkoutInformationSchema`**
(`src/validators/checkout.validator.ts`): email (`emailValidator`), phone
(`uaePhoneValidator`), first and last name, address line 1 and city required;
address line 2 and postal code optional; emirate one of `EMIRATE_VALUES`; the
email opt in. Continue runs it. Each message shows under its field through the
checkout `Field`'s `error` prop, which sets `aria-invalid`, points
`aria-describedby` at the message and hides the hint; focus moves to the
first invalid field. After a failed Continue, a field checks itself again on
blur. With a saved address selected only email and phone are checked; the
saved address itself is still a hardcoded mock until Phase 3 addresses.

**UAE phone rule.** `uaePhoneValidator` in
`src/validators/common/primitives.validator.ts` strips spaces, dashes, dots
and parentheses, then accepts a `+971`, `00971`, `971` or leading `0` prefix
followed by a mobile number (`5[024568]`) or a landline area code
(`[234679]`), plus seven digits. The value is normalised to E.164:
`050 123 4567` becomes `+971501234567`, `04 123 4567` becomes `+97141234567`.
Anything else reads "Enter a valid UAE phone number, e.g. 050 123 4567."

**Payment** card fields are checked only by the browser (`checkValidity`),
since card entry is still the mock.

These checks run in the browser only. No checkout endpoint exists yet; see
§13.

---

## 10. Constants

In `src/lib/constants.ts`.

| Constant | Value | Used by |
| --- | --- | --- |
| `VAT_RATE_PERCENT` | 5 | `priceCart` |
| `CART_MAX_LINES` | 20 | Lines per cart, merge cap, read limit |
| `CART_MAX_LINE_QUANTITY` | 5 | Quantity per line, validator, stepper maximum |
| `CART_COOKIE_MAX_AGE_SECONDS` | 30 days | Cookie lifetime and stale guest sweep |
| `MAX_COUPON_TARGETS` | 50 | Products and categories per coupon |
| `COUPON_CODE_MIN_LENGTH`, `COUPON_CODE_MAX_LENGTH` | 3, 32 | Coupon code |
| `COUPON_DESCRIPTION_MAX_LENGTH` | 160 | Coupon description |
| `MAX_DELIVERY_DAYS` | 30 | Delivery zone days |
| `RETURN_WINDOW_DAYS` | 30 | "30-day returns" copy on the cart summary, buy panel and home benefits |
| `RATE_LIMITS.applyCoupon` | 10 per 10 minutes, per user | `POST cart/coupon` |
| `RATE_LIMITS.guestCart` | 10 per hour, per IP | `POST cart/items` that creates a guest cart |

Rate limits work as described in [AUTH.md](AUTH.md) §7.

---

## 11. Tests

`npm test` runs Vitest (`vitest.config.ts`, `src/**/*.test.ts`). Phase 4
added `src/lib/pricing/price-cart.test.ts`, `src/lib/pricing/coupon.test.ts`,
`src/lib/cart-rules.test.ts`, `src/lib/delivery.test.ts`,
`src/lib/auth/sign.test.ts`, `src/validators/coupon.validator.test.ts` and
`src/validators/delivery-zone.validator.test.ts`. The checkout steps added
`src/validators/checkout.validator.test.ts` and
`src/validators/common/primitives.validator.test.ts` (the UAE phone rule).
They cover the pure rules only; the routes, the service and the checkout
steps have no automated tests.

---

## 12. Known limits

1. **Per customer coupon limits do nothing yet.** Redemptions count as 0
   until orders exist (Phase 5).
2. **`redemptionCount` is never incremented yet**, so a usage limit cannot be
   reached until Phase 5 checkout counts redemptions.
3. **Placing the mock order keeps the cart.** Emptying it belongs to the
   Phase 5 order transaction.
4. **"Free delivery" copy is hardcoded** on the buy panel ("Free delivery, On
   every order"), the cart summary trust row and the home benefits. It is true
   only while every zone's standard fee is 0. If an admin sets a standard fee,
   that copy must change.
5. **The guest cart rate limit is per IP.** Many shoppers behind one address
   (an office or a mobile carrier) share 10 new guest carts an hour; the 429
   message is the generic "Too many attempts." one.
6. **The add to cart modal's cross sell rail** still reads the mock catalogue
   (`src/lib/catalog.ts`, `src/lib/cross-sell.ts`) and links to product pages.
   A real product with no mock twin shows no rail.
7. **Before zones are seeded**, every quote answers 404, so checkout shows its
   error state. Run the seed once per database, or set the zones on the admin
   screen.
8. **Offered add-ons per line** are read in one query capped at
   `MAX_PRODUCT_ADD_ONS × CART_MAX_LINES` (80) rows and then filtered per line.
   With more than 80 active add-ons matching the cart's categories, a line
   could offer fewer than the product page does.
9. **Choosing another add-on on a line that still holds an unavailable one**
   answers 422, because the new set includes it. The shopper removes the
   unavailable chip first.

---

## 13. For Phase 5 checkout

1. Load the cart with the `cart.service` loader and price it with `priceCart`.
   Any blocking issue, or an attached coupon that is not `valid`, answers 409,
   so the charged total is the one the shopper saw.
2. Count coupon usage with `updateMany where id and (usageLimit is null or
   redemptionCount < usageLimit)` incrementing `redemptionCount`; a count of 0
   means 409. Count the customer's `CouponRedemption` rows inside the
   transaction and pass them to `evaluateCoupon`.
3. Empty the cart (delete items, clear `couponId`) in the same transaction.
4. Refuse to delete a coupon that has redemptions (409 "Disable it instead").
5. Decide whether an `ADD_ON_UNAVAILABLE` add-on is dropped from the order or
   blocks it; today it is simply not charged.
6. Parse the contact and address with `checkoutInformationSchema` on the
   server and store the normalised E.164 phone. The checkout's own check
   (§9.1) runs only in the browser.
