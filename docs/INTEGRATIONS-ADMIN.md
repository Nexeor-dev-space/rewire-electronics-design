# Integrations, API Keys

The admin screen where staff enter the storefront's analytics and site
verification IDs, see whether email and Stripe are configured, and test each
integration. Also the storefront tags and the purchase event those IDs turn
on. Issue #156.

Read this before you change `src/lib/integrations.ts`,
`src/services/integration.service.ts`, the `admin/integrations` routes, the
API Keys screen, `src/components/analytics/`, `src/lib/analytics.ts`, or the
purchase event on the checkout success page.
[INTEGRATIONS.md](INTEGRATIONS.md) covers the env values and
[PAYMENTS.md](PAYMENTS.md) covers Stripe.

---

## 1. What is built

| Built | Out of scope in the issue |
| --- | --- |
| The Integrations, API Keys screen, one row per integration | Entering secret keys (Resend, Stripe) in the admin; they stay in Coolify |
| Saving, validating and clearing the GA4, Clarity, Search Console and Meta Pixel values | Google Merchant Center and Meta Catalog feeds (#93) |
| Read only status of Email and Stripe from the environment | Google Tag Manager, Google and Apple sign in, WhatsApp Business API |
| A Test per integration, with its last result stored | A cookie consent banner |
| A change log entry on every save | |
| The GA4, Clarity and Meta Pixel tags and the Search Console tag, on storefront pages only | |
| A purchase event to GA4 and Meta Pixel from the checkout success page | |

Nothing on this screen has to be filled for the site to run. An empty value
means that integration is off.

---

## 2. The screen

The screen is **API Keys**, the first row of the **Integrations** group in the
admin sidebar, at `/admin/integrations/api-keys`. Google Merchant, Meta
Catalog and Product Feeds below it are still placeholders. The page checks
View with `hasPermission` and otherwise shows "Access denied" with "Your role
doesn't include Integrations, API Keys." The route is in `BUILT_ROUTES`.

Each row (`IntegrationRow`) shows:

1. The name and what it is for (`label` and `purpose` in `INTEGRATIONS`).
2. For the four IDs: the field, the hint "Format: {hint}, for example
   {example}. Leave empty to turn it off.", where to get the value (section
   3.2), "Last changed {date and time} by {name}" once it has been saved, and
   Save, which is enabled only when the field differs from the saved value.
3. For Email and Stripe: a Configured or Not configured badge, the status
   details, and "These values are set in the deployment environment
   (Coolify). Secrets are never shown here." (section 4).
4. The Test button and the last result: Passed or Failed, "Tested {date and
   time}" and its message, or "Not tested yet" (section 5).

Times use the store clock (`formatStoreDateTime`). The screen shows a skeleton
while loading, and the error message with Try again when the list fails.

Save checks the value in the browser with the same schema the API uses
(`integrationValueSchemas`), so a wrong format shows its message under the
field before any request. An error from the API lands on the same field
(`apiFieldErrors`). After a save the field shows the value as stored (trimmed,
case normalised) and "Saved.".

### Permission

1. The module is `integrations.api-keys` (`PERMISSIONS.integrations`),
   labelled "Integrations, API Keys" on the Roles screen, with View and Edit
   ([PERMISSIONS.md](PERMISSIONS.md) §4).
2. View opens the screen and reads the list. Edit saves a value and runs a
   Test.
3. Without Edit the fields are read only, Save and Test are hidden, and the
   screen says "Your role can view these integrations but not change or test
   them."
4. It is not Admin only, because the screen stores and shows no secret. There
   is no new role: an Admin gives a Staff role a level on the Roles screen.
   Staff roles that existed before hold No access until an Admin sets one.

---

## 3. The four IDs

### 3.1 Formats

`INTEGRATIONS` in `src/lib/integrations.ts` holds each rule. The validator,
the screen hint and the storefront all read it from there.

| Integration | Key | Accepted pattern | Hint | Example | Stored as |
| --- | --- | --- | --- | --- | --- |
| Google Analytics 4 | `GA4` | `^G-[A-Z0-9]{6,16}$` | `G-XXXXXXXXXX` | `G-AB12CD34EF` | Trimmed and uppercased |
| Microsoft Clarity | `CLARITY` | `^[a-z0-9]{6,20}$` | `abcd1234ef` | `k3x9p2m7qa` | Trimmed and lowercased |
| Google Search Console | `SEARCH_CONSOLE` | `^[A-Za-z0-9_-]{20,100}$` | "20 to 100 letters, digits, dashes or underscores" | `Xc8nP2qL7vR4tY9wK1mB6sD3fG0hJ5aZ_eU-iO2xN7c` | Trimmed, case kept |
| Meta Pixel | `META_PIXEL` | `^\d{15,16}$` | `123456789012345` | `804215376190482` | Trimmed |

The rules, in order (`integrationValueSchemas` in
`src/validators/integration.validator.ts`):

1. More than `INTEGRATION_VALUE_MAX_LENGTH` (200) characters is refused with
   "Keep it under 200 characters."
2. The value is trimmed and its case normalised (`normaliseIntegrationValue`),
   so ` g-ab12cd34ef ` is stored as `G-AB12CD34EF`.
3. Empty, or only spaces, is allowed and turns the integration off.
4. Anything else must match the pattern, or it is refused with "Expected
   format: {hint}, for example {example}."

For Search Console, paste only the value inside `content`, not the whole meta
tag: the whole tag is refused. The strict patterns also keep quotes, angle
brackets and spaces out of the inline scripts the IDs are placed in.

### 3.2 Where to get each value

The screen shows these under each field (`whereToGet`):

1. **Google Analytics 4:** "In Google Analytics, open Admin, then Data
   streams, choose the website stream and copy its Measurement ID."
2. **Microsoft Clarity:** "In Microsoft Clarity, open the project, then
   Settings, then Overview, and copy the Project ID."
3. **Google Search Console:** "In Google Search Console, add the site as a URL
   prefix property, choose the HTML tag method and copy only the value inside
   content."
4. **Meta Pixel:** "In Meta Events Manager, open Data sources, choose the
   pixel and copy the ID shown under its name."

### 3.3 What each one is for and where it renders

Every tag renders on the pages of the `(site)` route group and on no admin
page (section 6).

| Integration | What it is for (screen text) | What the storefront renders |
| --- | --- | --- |
| Google Analytics 4 | "Measures visits, traffic sources and purchases on the storefront." | The Google tag script `gtm.js?id=<ID>` and its setup script (section 6.2), and the purchase event (section 7) |
| Microsoft Clarity | "Shows how shoppers move through the storefront with heatmaps and session recordings." | Microsoft's setup script, which loads `https://www.clarity.ms/tag/<ID>` |
| Google Search Console | "Proves to Google that the store owns the site, so search performance and indexing can be checked." | `<meta name="google-site-verification" content="<token>">` in the head (section 6.3) |
| Meta Pixel | "Reports storefront visits and purchases to Meta to measure ads." | Meta's base code, which loads `fbevents.js` and runs `fbq('init', <ID>)` and `fbq('track', 'PageView')`, and the purchase event (section 7) |

Meta's `<noscript>` image fallback is not included.

---

## 4. Email and Stripe

1. **Read only.** These rows have no field and no Save. Their `value` is
   always empty, and `PUT` answers 404 for `EMAIL` and `STRIPE`.
2. **The values stay in the environment** (Coolify), by project rule: they
   are secrets and differ per environment ([INTEGRATIONS.md](INTEGRATIONS.md)
   §1). A change in Coolify shows on the screen after the redeploy that
   applies it.
3. **The status** is worked out on the server from its environment when the
   list loads. Nothing about it is stored.

### Email status

From `getIntegrationConfig()` ([INTEGRATIONS.md](INTEGRATIONS.md) §4):

| Transport | Badge | Details |
| --- | --- | --- |
| SMTP | Configured | Host, Port and Sender (`EMAIL_FROM`) |
| Console (not production, SMTP login not set) | Not configured | Missing: "SMTP_USER, SMTP_PASS and EMAIL_FROM are not set, so email is printed to the server log." |
| Off (production, SMTP login or `APP_URL` missing) | Not configured | Missing: "Production needs SMTP_USER, SMTP_PASS, EMAIL_FROM and APP_URL, so no email is sent." |
| An email value breaks its rule | Not configured | Problem: "The email settings in the environment are invalid. Check the server log." |

### Stripe status

From `describeStripe(process.env)` in `src/lib/stripe.ts`, a pure function:

1. **Configured** when `STRIPE_SECRET_KEY` passes `parseStripeEnv` and starts
   with `sk_live_`, `rk_live_`, `sk_test_` or `rk_test_`. The prefix gives the
   **Mode**, Live or Test.
2. **Webhook** is Set when `STRIPE_WEBHOOK_SECRET` passes
   `parseStripeWebhookEnv` (it starts with `whsec_`), and Not set otherwise.
3. **Problem**, when there is one: "STRIPE_SECRET_KEY is not set.",
   "STRIPE_SECRET_KEY is set but invalid." or "STRIPE_WEBHOOK_SECRET is set
   but invalid.", or the last two together. An empty webhook secret is Not
   set without a problem.

### Secrets stay out

1. For Email and Stripe, the screen and `GET admin/integrations` receive only
   the host, port, sender, mode, whether the webhook secret is set, the
   problem texts above and the Test messages (section 5). No key or password
   is put in a response.
2. `describeStripe` never repeats a value, not even an invalid one.
   `src/lib/stripe.test.ts` checks this.
3. The change log only ever receives `{ value }` of one of the four IDs
   (section 8), never anything from the environment.
4. Stripe's rules stay in `src/lib/stripe.ts`. The service only calls
   `describeStripe(process.env)` and `checkStripeKey()`, and never imports
   the Stripe SDK.

---

## 5. Tests

Test runs `runIntegrationTest(key, user)`, which stores the outcome on the
row (`lastTestOk`, `lastTestMessage`, `lastTestedAt`) and returns the row, so
the screen shows the last result without running it again. A Test never
changes `changedAt` or `changedBy` and writes no change log entry. A failed
Test still answers 200; the failure is in the result.

### 5.1 GA4, Clarity, Search Console and Meta Pixel

The Test opens the homepage and looks for the saved value in its HTML:

1. The saved value is read from the database. When it is empty: Failed,
   "Nothing is saved yet." When it fails its pattern, which only happens after
   an edit made directly in the database: Failed, "The saved ID is not in the
   expected format, so the storefront does not show it. Save it again."
2. The address is `appUrl("/")`, from `APP_URL`, or `http://localhost:3000`
   outside production. When it can't be built (no `APP_URL` in production, or
   invalid email settings): Failed, "The site address is unknown, so the
   homepage can't be checked. Check APP_URL."
3. The homepage is fetched without cache, with a timeout of
   `INTEGRATION_TEST_TIMEOUT_MS` (10 seconds). A status other than 2xx:
   Failed, "The homepage answered with status {status}." A network error or a
   timeout: Failed, "Couldn't open the homepage.", logged with
   `console.error`.
4. When the HTML contains the value: Passed, "Found on the homepage."
   Otherwise: Failed, "The homepage does not show this ID yet."

The format check in step 1 matches the storefront, which never renders a
value that fails its pattern (section 6.1). A Pass proves our server renders
the tag. It does not prove
that Google, Microsoft or Meta receive data; check that in each product, for
example in GA4 DebugView.

### 5.2 Email

The Test sends "Test email from Rewire Electronics" (`integrationTestEmail`,
with the name from `siteConfig`) to the
signed in staff member through `sendEmail`, the same path every other email
takes:

| What happens | Result | Message |
| --- | --- | --- |
| Sent over SMTP | Passed | "Test email sent to {email}." |
| Console transport | Failed | "Email is printed to the server log, not sent, because SMTP is not set up." |
| Email off in production | Failed | "Email isn't set up yet. Please try again later." |
| SMTP refuses or fails, or the email settings are invalid | Failed | The error's own message, or "The test email could not be sent." when it has none; logged with `console.error` |

Passed means the SMTP server accepted the message. Check that it arrived in
the inbox.

### 5.3 Stripe

1. Not configured: Failed, with the status problem, for example
   "STRIPE_SECRET_KEY is not set."
2. `checkStripeKey()` calls Stripe's `balance.retrieve` with the same 10
   second timeout. An authentication error: Failed, "Stripe refused the
   key." Any other error, such as a network failure: Failed, "Couldn't reach
   Stripe.", logged. Success, or a permission error (a restricted key without
   access to the balance), means the key is accepted.
3. Key accepted and the webhook secret set: Passed, "Stripe accepted the live
   mode key and the webhook secret is set." (or "test mode").
4. Key accepted without a valid webhook secret: Failed, "Stripe accepted the
   {live or test} mode key, but no valid webhook secret is set, so payments
   are only recorded when the customer comes back to the site."

The webhook part checks only that `STRIPE_WEBHOOK_SECRET` has the `whsec_`
form. It does not ask Stripe whether the webhook destination exists or uses
that secret; the destination's event log in Stripe is that check
([PAYMENTS.md](PAYMENTS.md) §8).

### 5.4 Rate limit

Each staff member may run 10 Tests per 10 minutes, across all rows
(`RATE_LIMITS.integrationTest`), because a Test sends an email, calls Stripe or
loads the homepage. Above it the API answers 429 "Too many attempts. Please
wait a few minutes and try again." with `Retry-After`, and the screen shows
the message under the row.

---

## 6. Storefront

### 6.1 Where the tags load

1. `StorefrontTags` (`src/components/analytics/storefront-tags.tsx`), a
   server component, is rendered by `src/app/(site)/layout.tsx` after
   `SiteChrome`. So the tags are on every page in the `(site)` route group:
   the storefront, cart, checkout, account and sign in pages. The admin
   console is outside `(site)`, so its server HTML never holds a tag.
2. Each tag renders only when its ID is saved.
3. They use `next/script` with the `afterInteractive` strategy, so they load
   after the page has hydrated, not ahead of the page content.
4. The values come from `getStorefrontIntegrations()`, an `unstable_cache`
   read tagged `INTEGRATIONS_CACHE_TAG` (`integrations`), the same pattern as
   `listStorefrontCategories`. It runs one query, then serves the cache until
   the next save.
5. It checks every value against its pattern again and treats one that fails
   as empty. A value that fails its pattern is never rendered, even one
   written straight into the database.
6. **Clearing a value.** Saving an empty value calls
   `revalidateTag(INTEGRATIONS_CACHE_TAG)`, and the `(site)` layout is
   `force-dynamic`, so the next full page load has no tag. A tab that already
   loaded the tag keeps it until it loads a page again. A new value applies
   the same way.

### 6.2 The GA4 snippet

The tag follows Google's current install snippet
(https://developers.google.com/tag-platform/gtagjs/install). It loads
`https://www.googletagmanager.com/gtm.js?id=<ID>` (`GA4_SCRIPT_URL`) and runs:

```js
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
```

1. There is no `gtag('config', …)`. That page marks the command deprecated
   and leaves it out of the default snippet.
2. Settings and destinations are not set in our code. That page says to set
   them in the Google Tag Manager UI.
3. Google places the snippet right after the opening `<head>`. Ours loads
   `afterInteractive`, because the issue asks for the tags to load after the
   page content.

### 6.3 The Search Console tag

`generateMetadata` in `src/app/(site)/layout.tsx` returns
`verification: { google: <token> }` when a token is saved. Next renders it as
`<meta name="google-site-verification" content="<token>">` in the head of
every `(site)` page, the homepage included. No page in `(site)` sets
`verification` itself, so none overrides it. With no token there is no tag.
The rest of the page metadata is in [CATALOGUE.md](CATALOGUE.md) §7.

### 6.4 The admin guard

A client side navigation from a storefront page into the console keeps the
tags the browser already loaded running, because the page is not reloaded.
Signing in on `/sign-in`, a `(site)` page, and being sent on to the console
is one such navigation. So `src/app/admin/layout.tsx` renders
`StorefrontTagsGuard` inside the shell. On mount it calls
`reloadIfStorefrontTagsRunning()` from `src/lib/analytics.ts`:

1. **No tag running** (`window.gtag`, `window.fbq` and `window.clarity` are
   not functions): it clears the session storage flag
   `rewire.storefront-tags-cleared` and does nothing else.
2. **A tag running, flag not set:** it sets the flag and reloads the page
   once. The reloaded admin page comes from the server without tags.
3. **A tag running, flag set:** it does not reload again, so a tag that
   somehow survives the reload cannot cause a reload loop.
4. **Session storage unavailable:** it does nothing.

The guard sits inside the shell, so it runs only for staff who reach the
console. The sign in redirect and the access denied screen do not reload.

---

## 7. The purchase event

`trackPurchase(order)` in `src/lib/analytics.ts` sends it. `Confirmation` in
`src/components/checkout/order-success.tsx` calls it in an effect for every
placed order that is not awaiting payment. An order is awaiting payment when
it is a card or Apple Pay order that is still Unpaid. So:

1. **Card and Apple Pay:** the event is sent when the customer comes back
   from Stripe and the success page shows the order paid
   ([PAYMENTS.md](PAYMENTS.md) §2).
2. **Cash on delivery:** the event is sent when the order is placed and the
   success page shows it.
3. An order still awaiting payment, or a payment the customer backed out of,
   sends nothing.

It sends only to the tags that are running:

| Tag | Call |
| --- | --- |
| GA4 (`window.gtag`) | `gtag("event", "purchase", { transaction_id, value, currency, items })` |
| Meta Pixel (`window.fbq`) | `fbq("track", "Purchase", { value, currency }, { eventID })` |

1. `transaction_id` and `eventID` are the order number (`RW-…`).
2. `value` is the order total, `totals.total` converted from fils to AED: the
   subtotal less any discount plus delivery, VAT included
   ([CART.md](CART.md) §3).
3. `currency` is `CURRENCY` (`AED`) from `src/lib/money.ts`.
4. Each entry of `items` has `item_id` (the SKU), `item_name` (the product
   name), `price` (the unit price plus the add-ons per unit, in AED, before
   any discount) and `quantity`.

**The value includes delivery and VAT, by choice.** The issue asks for the
order total, so `value` is what the customer pays. Google's reference for the
`purchase` event says to set `value` to the sum of price times quantity of
the items and not to include shipping or tax
(https://developers.google.com/analytics/devguides/collection/ga4/reference/events?client_type=gtag#purchase).
So GA4 revenue here includes delivery and VAT, and `value` will not always
equal the sum of `items`. This is a deliberate choice that can be revisited,
for example by sending an items only `value` with `shipping` and `tax` as
their own parameters.

**Once per order per browser.** After sending, it stores
`rewire.purchase-tracked.<order number>` in `localStorage` and skips any order
that already has it, so a reload or a later visit to the success page in the
same browser sends nothing. When neither GA4 nor Meta Pixel is running it
sends nothing and stores nothing.

---

## 8. API

Every route is under `/api/v1` and returns through `apiSuccess` or
`apiError`. A key in the path is the uppercase enum value; `ga4` is 404.

| Route | Auth | Success | Errors |
| --- | --- | --- | --- |
| `GET admin/integrations` | `PERMISSIONS.integrations` View | 200 `IntegrationView[]`, exactly six rows in `INTEGRATIONS` order | 401, 403, 500 |
| `PUT admin/integrations/[key]` | Edit | 200 `IntegrationView` | 401, 403, 404 "We couldn't find that integration." (an unknown key, `EMAIL` or `STRIPE`), 422, 500 |
| `POST admin/integrations/[key]/test` | Edit; `integrationTest` limit per user | 200 `IntegrationView` with the new `lastTest` | 401, 403, 404 "We couldn't find that integration." (an unknown key), 429 with `Retry-After`, 500 |

1. **`IntegrationView`** (`src/types/integration.ts`) is
   `{ key, value, status, lastTest, changedBy, changedAt }`. `value` is empty
   for Email and Stripe. `status` is null for the four IDs, and
   `{ configured, details: [{ label, value }] }` for Email and Stripe.
   `lastTest` is `{ ok, message, at }` or null. `changedBy` is the staff
   member's name or null, and `changedAt` an ISO time or null.
2. **A bounded list.** `GET admin/integrations` returns a plain array, not a
   page: always six rows, one per `IntegrationKey`, fixed by the
   `INTEGRATIONS` catalogue. It is one of the bounded lists named in
   [DATA-LAYER.md](DATA-LAYER.md) §4.
3. **`PUT` body** is `{ value }`, checked with `integrationValueSchemas[key]`
   (section 3.1). A refused value answers 422:
   `{ code: "VALIDATION", message: "Please check the highlighted fields.", fields: { value: ["Expected format: G-XXXXXXXXXX, for example G-AB12CD34EF."] } }`.
4. **Change log.** `PUT` records `UPDATE` under the module
   `integrations.api-keys`, with the key as the record id, the integration's
   name as the label, and only `{ value }` before and after. As with every
   entry, a save that leaves the value unchanged records nothing
   ([TRASH-AUDIT.md](TRASH-AUDIT.md) §4).
5. **`POST …/test`** has no body. Its order of checks is the session and
   Edit, then the key, then the rate limit.

Paths: `API_ENDPOINTS.admin.integrations.list`, `.detail(key)` and
`.test(key)`.

**Hooks** in `src/hooks/use-integrations.ts`: `useGetIntegrations()` (query
key `["integrations"]`), `useUpdateIntegration()` and `useTestIntegration()`.
Both mutations invalidate the list on success, as
[DATA-LAYER.md](DATA-LAYER.md) requires, so the screen fetches all six rows
again, including any change another staff member made.

---

## 9. Database

`prisma/schema/settings.prisma` holds the `IntegrationKey` enum (`GA4`,
`CLARITY`, `SEARCH_CONSOLE`, `META_PIXEL`, `EMAIL`, `STRIPE`) and the
`Integration` model, table `integrations`:

| Column | Type | Meaning |
| --- | --- | --- |
| `key` | `IntegrationKey`, primary key | Which integration |
| `value` | `String`, default empty | The saved ID or token. Always empty for `EMAIL` and `STRIPE` |
| `changedById` | `String?`, relation to `User`, `onDelete: SetNull` | The last staff member to save it (`User.integrationChanges`) |
| `changedAt` | `DateTime?` | Set by hand on save only, not `@updatedAt`, so a Test is not a change |
| `lastTestOk` | `Boolean?` | The last Test passed or failed |
| `lastTestMessage` | `String`, default empty | The last Test's message |
| `lastTestedAt` | `DateTime?` | When the last Test ran |

1. One row per integration at most. A row is created by an upsert on the
   first save or the first Test. No row reads as empty and never tested, so
   nothing is seeded.
2. Email and Stripe rows only ever hold test results.
3. Migration `20261113033523_add_integrations`: additive, one enum, one table
   and its foreign key to `users`. It is unrelated to the
   `integration_settings` tables that the `drop_integration_settings`
   migration removed ([INTEGRATIONS.md](INTEGRATIONS.md) §1).

---

## 10. Constants

In `src/lib/constants.ts` unless noted.

| Constant | Value | Used by |
| --- | --- | --- |
| `INTEGRATIONS_CACHE_TAG` | `integrations` | The storefront cache, cleared on save |
| `INTEGRATION_TEST_TIMEOUT_MS` | 10 000 | The homepage fetch and the Stripe call in a Test |
| `INTEGRATION_VALUE_MAX_LENGTH` | 200 | Longest value accepted before the format check |
| `GA4_SCRIPT_URL` | `https://www.googletagmanager.com/gtm.js` | The GA4 tag |
| `CLARITY_SCRIPT_URL` | `https://www.clarity.ms/tag/` | The Clarity tag, followed by the project ID |
| `META_PIXEL_SCRIPT_URL` | `https://connect.facebook.net/en_US/fbevents.js` | The Meta Pixel tag |
| `RATE_LIMITS.integrationTest` | 10 per 10 minutes, per user | `POST admin/integrations/[key]/test` |
| `PURCHASE_TRACKED_KEY_PREFIX` (`analytics.ts`) | `rewire.purchase-tracked.` | The once per order flag |
| `TAGS_CLEARED_KEY` (`analytics.ts`) | `rewire.storefront-tags-cleared` | The admin guard's flag |
| `INTEGRATIONS` (`integrations.ts`) | | Every label, purpose, pattern, hint, example and where to get it |

The Test messages are constants at the top of `integration.service.ts` and
`stripe.ts`.

---

## 11. Files

| File | Purpose |
| --- | --- |
| `prisma/schema/settings.prisma` | `IntegrationKey` and `Integration` (section 9) |
| `src/lib/integrations.ts` | `INTEGRATIONS`, `INTEGRATION_KEYS`, `ID_INTEGRATIONS`, `ID_INTEGRATION_KEYS`, `integrationDefinition`, `normaliseIntegrationValue` (client safe) |
| `src/types/integration.ts` | `IdIntegrationKey`, `EnvIntegrationKey`, `IntegrationKey`, `IntegrationStatus`, `IntegrationTestResult`, `IntegrationView`, `StorefrontIntegrations`, `IntegrationValueInput` |
| `src/validators/integration.validator.ts` | `integrationParamsSchema` (all six keys, for Test), `idIntegrationParamsSchema` (the four IDs, for save), `integrationValueSchemas` |
| `src/lib/stripe.ts` | `describeStripe(env)` and `checkStripeKey()` |
| `src/lib/email/templates.ts` | `integrationTestEmail(name)` |
| `src/services/integration.service.ts` | `listIntegrations`, `updateIntegrationValue`, `runIntegrationTest`, `getStorefrontIntegrations` |
| `src/app/api/v1/admin/integrations/` | The routes (section 8) |
| `src/lib/api/api-endpoints.ts` | `API_ENDPOINTS.admin.integrations` |
| `src/lib/auth/permissions.ts`, `src/lib/admin-nav.ts` | The module and its sidebar row |
| `src/hooks/use-integrations.ts` | `useGetIntegrations`, `useUpdateIntegration`, `useTestIntegration` |
| `src/app/admin/integrations/api-keys/page.tsx` | Permission check, renders the screen |
| `src/components/admin/integrations/integrations-screen.tsx`, `integration-row.tsx` | The list, and one row with its field or status and its Test panel |
| `src/components/analytics/storefront-tags.tsx` | The tags (server) |
| `src/components/analytics/storefront-tags-guard.tsx` | The admin guard (client) |
| `src/lib/analytics.ts` | `trackPurchase`, `reloadIfStorefrontTagsRunning` (browser only) |
| `src/app/(site)/layout.tsx` | Renders `StorefrontTags`; `generateMetadata` adds the Search Console tag |
| `src/app/admin/layout.tsx` | Renders `StorefrontTagsGuard` |
| `src/components/checkout/order-success.tsx` | Calls `trackPurchase` |

---

## 12. Tests

1. `src/validators/integration.validator.test.ts`: for each ID, the accepted
   values, refused values with the "Expected format" message, empty allowed,
   trimming and case, and a missing or overlong value; the exact GA4 message;
   Search Console keeping its case; and that Test accepts all six keys while
   save accepts only the four IDs.
2. `src/lib/stripe.test.ts`: `describeStripe` with fake env objects for an
   unset key, test and live keys, restricted keys, an invalid key, a set,
   unset and invalid webhook secret, both problems at once, and that no
   message ever contains a secret.

Run them with
`npx vitest run src/validators/integration.validator.test.ts src/lib/stripe.test.ts`.
The Test runs themselves (the homepage fetch, SMTP and Stripe), the routes,
the screen, the tags, the admin guard and the purchase event have no
automated tests; they are checked by hand.

---

## 13. Known limits

1. **Preview pages carry the tags.** The tags also load on the `(site)/preview`
   pages, such as the staff homepage draft preview, because they sit inside
   `(site)`.
2. **No cookie consent banner.** It is out of scope in the issue. Once an ID
   is saved, its tag loads for every visitor.
3. **Database edits wait for a save.** A value edited directly in the
   database reaches the storefront only after the next save on the screen,
   because the storefront cache is cleared by its tag only and has no time
   limit.
4. **The purchase event comes from the browser only.** A card payment
   recorded only by the Stripe webhook, because the customer never came back
   to the success page, sends no event.
5. **Blocked local storage repeats the event.** When `localStorage` can't be
   written, the once per order flag is lost, so each reload of the success
   page sends the purchase again.
6. **The Test rate limit is kept in memory.** Like every rate limit here, it
   counts per server process and resets on a restart.

---

## 14. Go live

1. Copy the GA4 measurement ID, the Clarity project ID and the Search Console
   token (section 3.2), enter each on Integrations, API Keys and press Save.
   Add the Meta Pixel ID too when Meta ads are used.
2. Check that `APP_URL` is the public address, then press Test on each saved
   row. Each should pass with "Found on the homepage."
3. In Google Search Console, press Verify on the URL prefix property. Keep the
   token saved afterwards; clearing it removes the tag Google checks for.
4. Press Test on Email. It should pass, and the test email should arrive in
   your inbox.
5. Press Test on Stripe. It should pass, with the live mode key on production
   and the webhook secret set.
6. Open GA4 Realtime or DebugView and the Clarity dashboard, and check that
   the first visits arrive.
