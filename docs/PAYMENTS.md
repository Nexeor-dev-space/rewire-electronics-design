# Payments (Stripe)

How Card and Apple Pay orders are paid through Stripe Checkout, Stripe's own
hosted payment page, and how Stripe webhooks keep orders right when the
customer never comes back, pays twice, or the network fails. Issue #80.

Read this before you change `src/services/payment.service.ts`,
`src/lib/stripe-checkout.ts`, `src/lib/stripe.ts`, `recordStripePayment` or
`addPaymentNote` in `order.service.ts`, `POST checkout`,
`POST checkout/payment`, `POST webhooks/stripe`, or the checkout success page.
[ORDERS.md](ORDERS.md) covers orders and their statuses,
[INTEGRATIONS.md](INTEGRATIONS.md) covers env values.

---

## 1. What is built

| Built | Later steps |
| --- | --- |
| Card and Apple Pay go to Stripe's payment page | Cancelling orders that are never paid |
| Coming back from Stripe marks the order paid | |
| Webhooks: paid, failed, expired, async bank results | Refunds through Stripe (refunds stay manual) |
| Stripe's payment id kept on the order and shown to staff | |
| Second payments and payments on cancelled orders flagged for staff | |

Refunds stay manual: staff refund in the Stripe dashboard, then record it in
the admin as before ([ORDERS.md](ORDERS.md) §4, [RETURNS.md](RETURNS.md) §5).
Cash on delivery is unchanged.

**No automatic retries, by decision (2026-10-16).** A failed or abandoned
payment is never charged again by the system; the customer checks out again
instead.

---

## 2. The flow

1. The customer picks Card or Apple Pay. The payment step says "After you
   place your order, you'll pay on Stripe's secure page."
   (`PAYMENT_REDIRECT_NOTICE`). We never see card details.
2. `POST checkout` places the order exactly as before
   ([ORDERS.md](ORDERS.md) §5): status Awaiting payment, payment Unpaid.
3. While the order is a card or Apple Pay order, Awaiting payment and Unpaid,
   the route calls `startOnlinePayment(order)`, which returns the Stripe
   Checkout Session to send the customer to: the order's open one when there
   is one, else a new one (section 4, "One open page per order"). The
   response is `{ order, paymentUrl }` (`PlacedOrder`); `paymentUrl` is null
   for cash on delivery, and when the saved page turns out to be paid already.
4. The browser goes to `paymentUrl` (`window.location.assign`).
5. **Paid:** two independent paths record it, whichever comes first:
   1. Stripe sends the customer to
      `/checkout/success?order=RW-…&session_id=cs_…`; the page posts the
      session id to `POST checkout/payment`, which reads the session from
      Stripe and settles it.
   2. Stripe sends `checkout.session.completed` to `POST webhooks/stripe`,
      which settles the same session.
   Both call `recordStripePayment` (section 4). The second to arrive finds the
   payment already recorded and does nothing.
6. **Backed out:** Stripe's back link goes to
   `/checkout/success?order=RW-…&payment=cancelled`. The page says the payment
   wasn't finished and the order is saved but not confirmed. The order stays
   Awaiting payment.
7. **Page closed unpaid:** after `CHECKOUT_PAYMENT_WINDOW_MINUTES` (30) Stripe
   sends `checkout.session.expired`; the order gets a staff note.

The confirmation email still goes out when the order is placed. For card and
Apple Pay it reads "We'll confirm your order as soon as your payment goes
through." (`PAYMENT_PENDING_NOTICE`).

---

## 3. The Stripe session

`checkoutSessionParams(order, urls, now)` in `src/lib/stripe-checkout.ts`
(pure, tested) builds it:

| Field | Value |
| --- | --- |
| `mode` | `payment` |
| `line_items` | One line, "Order RW-…", quantity 1, `unit_amount` the order total in fils, currency `aed` (from `CURRENCY`) |
| `client_reference_id` | The order number |
| `metadata.orderNumber`, `payment_intent_data.metadata.orderNumber` | The order number, on the session and on its payment, so every webhook event can be traced to the order (`metadataOrderNumber`) |
| `customer_email` | The order email |
| `success_url` | The success page with `&session_id={CHECKOUT_SESSION_ID}`; Stripe swaps in the real id |
| `cancel_url` | The success page with `&payment=cancelled` |
| `expires_at` | Now plus `CHECKOUT_PAYMENT_WINDOW_MINUTES` (30), Stripe's minimum |

The order is charged as one total, so the price, coupon, delivery fee and VAT
all come from the order and Stripe never prices anything. Which payment methods
show (card, Apple Pay) is set in the Stripe dashboard.

---

## 4. Recording a payment

A session counts only when `isPaidFor(session, order)`: `payment_status` is
`paid`, the metadata order number is this order, `amount_total` equals the
order total, and the currency is `aed`. A paid session that fails this is
logged and changes nothing.

Then `recordStripePayment(number, paymentIntentId)` in `order.service.ts`, in
one transaction, decides with `paymentOutcome` (pure, tested):

| Outcome | When | What happens |
| --- | --- | --- |
| `MARK_PAID` | The order is Unpaid and not cancelled | Paid and Confirmed with the note "Payment received", as when staff press Mark paid (no actor); `stripePaymentIntentId` is stored |
| `ALREADY_RECORDED` | The order already holds this payment id | Nothing (a resent event, a reload of the return page, or the second of the two paths) |
| `DUPLICATE` | The order is paid by a different Stripe payment | Staff note "Second payment pi_… received for an order that is already paid. Refund it in Stripe." |
| `ON_CANCELLED` | The order is cancelled and unpaid | Staff note "Payment pi_… received for a cancelled order. Refund it in Stripe." |
| `PAID_BY_HAND` | The order was marked paid by staff, no payment id yet | The id is stored, and the staff note "Stripe payment pi_… received after the order was marked paid by hand. Check it isn't a second payment." |

The last three are also logged with `console.error`. The payment id is unique
in the database, so one Stripe payment can never be stored on two orders.

When the return page and the webhook record the same payment at the same
moment, the slower transaction hits the guarded update and fails with a
conflict; `recordStripePayment` runs it once more (`STRIPE_PAYMENT_ATTEMPTS`)
and finds `ALREADY_RECORDED`.

**One open page per order.** A retried Place order (after a network error or
a 502) replays the same order, so it must not open a second payable page:
paying on two would charge twice. The order keeps its current page in
`stripeCheckoutSessionId`, and `startOnlinePayment` reads it from Stripe and
applies `savedSessionAction` (pure, tested):

| Saved page | Action |
| --- | --- |
| None, or Stripe no longer has it | Open a new page |
| Open, at least `CHECKOUT_SESSION_REUSE_MIN_MINUTES` (5) left | Send the customer to the same page |
| Open, less time left (or no url) | Close it (`sessions.expire`), then open a new page |
| Expired | Open a new page |
| Complete | Open nothing: settle it (section 4) and return the order with no `paymentUrl` |

1. Stripe refuses to close a page that was just paid. `closeSession` then
   reads it back: complete is settled as above; still open is a 502, so a
   second page is never opened.
2. A new page is saved with `claimCheckoutSession(number, previous, next)`,
   an update guarded on the previous value. When two checkouts race, the
   loser closes its own page and runs once more (`SESSION_CLAIM_ATTEMPTS`),
   reusing the winner's page.
3. If Stripe can't be reached to check the saved page, the call is a 502
   rather than a guess. The customer presses Place order again.
4. Closing a page makes Stripe send `checkout.session.expired`, which adds the
   usual "page closed" staff note.

**Staff notes** are `OrderStatusEvent`s on the order's current status with no
actor, added by `addNoteOnce`, which skips a note already present (a resent
event). They show in the admin History. Customers don't see them: the
customer timeline shows only the first event of each status
([ORDERS.md](ORDERS.md) §3), and Awaiting payment has no step of its own.

---

## 5. API

| Route | Auth | Success | Errors |
| --- | --- | --- | --- |
| `POST checkout` | as before | 201 / 200 `PlacedOrder` `{ order, paymentUrl }` | as before, plus 503 `NOT_CONFIGURED` "Card payments aren't available right now. Please try again later." (no or bad key), 502 `INTERNAL` "We couldn't open the payment page. Please try again." (Stripe failed) |
| `POST checkout/payment` | none; `confirmPayment` limit by IP | 200 `OrderDetail` | 404 "We couldn't find that payment.", 422 (not a `cs_test_…` / `cs_live_…` id), 429, 502 "We couldn't check your payment. Please try again.", 503 |
| `POST webhooks/stripe` | the `Stripe-Signature` header; no session, no rate limit | 200 `{ received: true }` | 400 "Invalid Stripe signature.", 503 "Stripe webhooks are not configured.", 500 on any other failure |

1. **`POST checkout/payment`** body: `{ sessionId }` (`confirmPaymentSchema`,
   up to 255 characters). Holding the session id is what lets a guest see the
   order, the same way the email is the second factor on Track Order.
2. **A 502 on `POST checkout` leaves the order placed.** The checkout page
   keeps its idempotency key after a 5xx, so pressing Place order again replays
   the order and goes to its open Stripe page, or a new one (section 4).

Paths: `API_ENDPOINTS.checkout.place`, `API_ENDPOINTS.checkout.confirmPayment`.
The webhook path is called by Stripe only, so it is not in `API_ENDPOINTS`.

---

## 6. Webhooks

`src/app/api/v1/webhooks/stripe/route.ts` reads the raw body, and
`verifyWebhookEvent(payload, signature)` checks it with
`stripe.webhooks.constructEvent` and `STRIPE_WEBHOOK_SECRET`. A missing or
altered signature is a 400, so a forged "paid" message changes nothing.
`handleStripeEvent(event)` then acts:

| Event | Action |
| --- | --- |
| `checkout.session.completed` | Settle the session (section 4). For cards and Apple Pay it arrives already paid |
| `checkout.session.async_payment_succeeded` | The same. Only fires for delayed methods such as bank debits |
| `checkout.session.async_payment_failed` | Staff note "Payment pi_… failed: The bank did not confirm the payment." |
| `checkout.session.expired` | Staff note "Stripe payment page cs_… closed without payment.", only while the order is still Unpaid |
| `payment_intent.payment_failed` | Staff note "Payment pi_… failed: {Stripe's reason}", for example a decline |
| anything else | Acknowledged and ignored |

**How the faults are covered:**

1. **Paid but the customer never came back** (tab closed, network drop):
   `checkout.session.completed` marks it paid.
2. **Paid twice:** a second, different payment is a `DUPLICATE` note to refund.
   The same payment sent twice is `ALREADY_RECORDED`.
3. **Network or database failure on our side:** any error other than a bad
   signature or a missing secret answers 500, and Stripe retries the event for
   up to 3 days. Every action is safe to repeat.
4. **Events for unknown orders** (a dashboard test event, no order number) are
   logged and acknowledged with 200, so Stripe does not retry them forever.

---

## 7. Client

1. **`usePlaceOrder()`** resolves to `PlacedOrder`; it caches `order` as
   before. `checkout-view.tsx` goes to `paymentUrl` when set ("Taking you to
   secure payment…"), else to the success page.
2. **`useConfirmPayment(sessionId)`** (`src/hooks/use-checkout.ts`) is a
   `useQuery` with a POST, enabled when the id is set, `retry: false`,
   `staleTime: Infinity`.
3. **`OrderSuccess`** takes `number`, `sessionId` and `paymentCancelled` from
   the page's query and shows one of: the Stripe return (Confirming your
   payment…, then the confirmation, or the error with Try again), the payment
   not finished panel, or the existing placed order view.
4. **Admin order detail** shows "Stripe payment pi_…" in the Payment panel
   when the order holds one (`AdminOrderDetail.stripePaymentIntentId`).

---

## 8. Setup

Two env values ([INTEGRATIONS.md](INTEGRATIONS.md) §3), each with its own
reader so a missing webhook secret never stops card payments:

| Key | Reader | Rule |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `stripeEnv()` | Required for card payments. Starts with `sk_` (or `rk_` for a restricted key); a publishable `pk_` key is refused |
| `STRIPE_WEBHOOK_SECRET` | `stripeWebhookEnv()` | Required for webhooks. Starts with `whsec_` |

**Payments:**

1. Stripe dashboard (test mode), Developers, API keys: copy the secret key into
   `.env` as `STRIPE_SECRET_KEY`. Use the live key in production.
2. Settings, Payment methods: turn on Cards and Apple Pay.
3. Restart. Test with card `4242 4242 4242 4242`, any future date, any CVC.

**Webhooks** (one per environment; Stripe can't reach `localhost`, so test on
staging):

1. Developers, Webhooks, Add destination. Any name, for example
   `rewire-staging-orders`.
2. Events: `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `payment_intent.payment_failed`.
3. Endpoint url: `https://<domain>/api/v1/webhooks/stripe`.
4. Copy the signing secret (`whsec_…`) into the environment as
   `STRIPE_WEBHOOK_SECRET` and redeploy.
5. Pay a test order and check the destination's event log shows 200s.

The publishable key is not used: the payment page is Stripe's, not ours.
`APP_URL` must be set in production, because the return urls are built with
`appUrl` ([INTEGRATIONS.md](INTEGRATIONS.md)).

---

## 9. Database

Two columns on `Order`, both `String?` and unique, added with the migration
`20261016112315_add_payment`:

1. **`stripePaymentIntentId`**: the payment (`pi_…`) that paid the order. Null
   for cash on delivery and unpaid orders. Set by `recordStripePayment` only.
2. **`stripeCheckoutSessionId`**: the order's current payment page (`cs_…`).
   Set by `claimCheckoutSession` only; replaced when a new page is opened.

---

## 10. Constants

In `src/lib/constants.ts` unless noted.

| Constant | Value | Used by |
| --- | --- | --- |
| `CHECKOUT_PAYMENT_WINDOW_MINUTES` | 30 | How long the Stripe page stays open |
| `CHECKOUT_SESSION_REUSE_MIN_MINUTES` | 5 | Least time left for a retry to reuse the open page |
| `SESSION_CLAIM_ATTEMPTS` (`payment.service.ts`) | 2 | Rerun after losing the race to save a page |
| `MS_PER_MINUTE` | 60 000 | `expires_at` |
| `CHECKOUT_SESSION_ID_PARAM` | `session_id` | Success url query key |
| `PAYMENT_RESULT_PARAM`, `PAYMENT_CANCELLED_VALUE` | `payment`, `cancelled` | Cancel url query |
| `RATE_LIMITS.confirmPayment` | 20 per 10 minutes, per IP | `POST checkout/payment` |
| `STRIPE_PAYMENT_ATTEMPTS` (`order.service.ts`) | 2 | Rerun after losing a race |
| `PAYMENT_NOTES` (`stripe-checkout.ts`) | | Every staff note text |

The payment window is a constant for now. It should move to store settings,
since it is part of how the feature behaves.

---

## 11. Tests

`src/lib/stripe-checkout.test.ts` (`paymentOutcome`, `sessionPaymentIntentId`,
`failureReason`, `PAYMENT_NOTES`, `savedSessionAction`) and `parseStripeWebhookEnv` in
`src/lib/env.test.ts`. The Stripe calls, `recordStripePayment` and the webhook
route are verified by hand with test keys.

---

## 12. Known limits

1. **Checking out again starts from an empty cart.** The first order emptied
   it, and that unpaid order stays Awaiting payment with its stock held until
   it is cancelled.
2. **Duplicate payments are flagged, not refunded.** One order has one open
   page at a time, so a double charge needs something outside checkout (for
   example staff marking it paid by hand, or a second order). Staff refund it
   in Stripe.
3. **Stripe's minimum charge.** Stripe refuses a total below its minimum
   (about 2 AED), so such a card order answers 502; cash on delivery works.
4. **A staff note is skipped when the exact same text is already on the
   order.** Two different failures with the same reason on the same payment
   show once.
