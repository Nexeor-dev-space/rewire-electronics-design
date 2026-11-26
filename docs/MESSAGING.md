# Marketing automation: email and WhatsApp triggers

Issue #94. Every automated email and WhatsApp message, what causes it, who
may receive it, and how Admin sees what was sent, failed or skipped.

Read this before you add a message, change when one is sent, or touch
`src/services/message*.ts`, `src/services/release-message.service.ts`,
`src/services/customer-email.service.ts`, `src/lib/messaging.ts`,
`src/lib/email/message-templates.ts`, `src/lib/whatsapp/`,
`src/instrumentation.ts` or the Marketing Messages screen.

A release's own reminder times, its test emails and the deletion of a
completed release's waitlist (`purgeEndedWaitlists` in
`src/services/waitlist.service.ts`, run by this module's timer) are in
[RELEASES.md](RELEASES.md) §13. The release stock sweeps the same timer runs
are in [RELEASES.md](RELEASES.md) §14.

---

## 1. What changed and why

Before this, a few emails were sent straight from services and left no trace,
and the release emails, WhatsApp, abandoned checkout and warranty notices did
not exist. Now:

1. Every message goes through one door, `dispatchEmail` or `dispatchWhatsApp`
   in `src/services/message.service.ts`. The release test emails are the one
   exception (section 4).
2. Each attempt is saved in `MessageLog` with its outcome: Sent, Failed (with
   the error) or Skipped (with the reason).
3. Messages are caused by real events (a status change, a confirmed waitlist
   place, an account restore) or by a timer that reads live records (a cart
   left behind, a warranty date coming up). Nothing is sent to a customer by
   hand, and no trigger uses mock data.
4. Admin sees the history per customer and as a full log.

---

## 2. The triggers

Email unless the WhatsApp column says otherwise.

| Message | Event that causes it | Sent by | WhatsApp |
| --- | --- | --- | --- |
| Waitlist welcome | A waitlist place is confirmed (link clicked, or a verified owner joins). A guest also gets the confirm link email under the same name | `sendWaitlistWelcome`, `mailConfirmLink` | No |
| Campaign message | A Published campaign linked to a release is live | Timer, `sweepCampaignMessages` | No |
| Countdown update | A saved release offset of one day or more is reached | Timer, `sweepReleaseSequence` | Yes |
| Drop reminder | A saved release offset under one day is reached | Timer, `sweepReleaseSequence` | Yes |
| Drop live | The release opens and has units | Timer, `sweepReleaseSequence` | Yes |
| Back in stock | Units return to a sold out release (allocations saved) | `notifyBackInStock` | No |
| Abandoned checkout | A signed in customer leaves items in the cart | Timer, `sweepAbandonedCheckouts` | No |
| Email verification | Sign up, or Resend email | `sendVerificationEmail` | No |
| Account reactivation | A user is restored from Trash | `notifyAccountReactivated` | No |
| Order confirmation | An order is placed | `notifyOrderPlaced` | No |
| Payment received | An order is paid | `notifyOrderPaid` | No |
| Dispatch update | Status becomes Dispatched | `notifyOrderStatus` | No |
| Delivery attempt failed | Staff press Delivery attempt failed on a dispatched order | `notifyDeliveryAttemptFailed` | No |
| Delivery confirmation | Status becomes Delivered | `notifyOrderStatus` | No |
| Order cancelled | Status becomes Cancelled | `notifyOrderStatus` | No |
| Device record | Delivery, for orders that have devices | `sendDeliveryRecords` | No |
| Add-on entitlement summary | Delivery, for orders that have add-ons | `sendDeliveryRecords` | No |
| Review request | 7 days after delivery, no return raised | Timer, `sweepReviewRequests` | No |
| Entitlement reminder | Extra cover from an add-on ends within 60 days | Timer, `sweepEntitlementReminders` | No |
| Warranty expiry notice | A line's warranty ends within 30 days | Timer, `sweepWarrantyExpiry` | No |
| Warranty claim status | A claim is opened or changes status | `notifyClaimOpened`, `notifyClaimDecision` | No |
| Warranty follow up | 7 days after a claim is Returned to customer | Timer, `sweepWarrantyFollowUps` | No |
| Return update | A return is received, decided or refunded | `notifyReturn…`, `notifyRefundIssued` | No |

Payment received, Order cancelled and Return update are not in the issue; they
were already sent and are logged too so a customer's history is complete.

Judgement calls worth knowing:

1. **Countdown vs reminder.** A release keeps a list of offsets in minutes
   (`reminderOffsetsMinutes`, default 48 hours and 1 hour, changed by staff
   per release, [RELEASES.md](RELEASES.md) §13). An offset at or
   above `COUNTDOWN_MIN_OFFSET_MINUTES` (1 day) is a Countdown update, a
   shorter one a Drop reminder.
2. **Review request** links to the order page. There is no review feature
   yet, so the email asks how the order is going and points to support.
3. **Back in stock** covers releases only. The wishlist lives in the browser
   ([WISHLIST.md](WISHLIST.md)), so there is no server list of who wants a
   shop product restocked.
4. **Campaign message** goes to the linked release's waitlist, the only list
   of people who opted in and have an unsubscribe link. A campaign with no
   release sends nothing.
5. **Abandoned checkout** goes to signed in, verified customers only, at most
   once per `ABANDONED_CHECKOUT_COOLDOWN_DAYS`, and not if they ordered since.

---

## 3. Who receives what

1. **Transactional** messages (orders, delivery, warranty, verification,
   reactivation) go to the order's or account's email. No opt in is needed.
2. **Release and campaign** messages go only to waitlist entries that are
   confirmed and have `emailOptIn`. Each carries a signed leave link.
3. **WhatsApp** is limited to Countdown update, Drop reminder and Drop live
   (`WHATSAPP_TRIGGERS` in `src/lib/messaging.ts`). It needs a confirmed
   entry, `whatsappOptIn` and a stored phone. `dispatchWhatsApp` refuses any
   other trigger and records it as Skipped.
4. WhatsApp sends only pre approved templates
   (`src/lib/whatsapp/templates.ts`). The template names are in
   `WHATSAPP_TEMPLATES`; each body takes its variables in the order the
   builder documents.

---

## 4. How a message is sent

`dispatchEmail` and `dispatchWhatsApp` do this, and never throw:

1. **Claim.** Insert a `MessageLog` row with the event's `dedupeKey` (unique).
   If the key exists, the event was already handled and nothing is sent. Only
   a Failed row with attempts left (`MESSAGE_MAX_ATTEMPTS`, 3) is taken again.
2. **Block.** A caller can pass `blocked` (no opt in, no phone) to record the
   message as Skipped with that reason.
3. **Build.** The content is built from live data, only now.
4. **Send.** Email through `sendEmail` (so the footer and email settings still
   apply). WhatsApp through `sendWhatsApp`.
5. **Record.** Sent, Failed with the error, or Skipped with the reason.
   When email is in console mode, the row is Sent with a note that it only
   reached the server log.

Because the key is per event, restarting the server or running two servers
never sends a message twice. Events that may repeat (a resent verification
link) use no key and are always sent.

Key shapes: `ORDER_DISPATCHED:{number}:{tracking}`,
`WARRANTY_CLAIM_STATUS:{number}:{status}`,
`DROP_REMINDER:EMAIL:{releaseId}:{offset}:{opensAtMs}:{entryId}`. A release
that is moved has a new opening time, so its waitlist hears the new time.

**The one exception: release test emails.** `sendReleaseTestEmails` in
`release-message.service.ts` calls `sendEmail` directly and writes no
`MessageLog` row. It sends a release's confirm, welcome, reminder and live
emails to the signed in admin, with "[Test]" at the start of each subject,
when staff press Send test emails to me. Two reasons keep it outside the
door:

1. The log is the record of what customers were sent. Staff tests would fill
   Marketing Messages with rows that no customer received.
2. A test must send again on every press, so it can have no dedupe key.

It still goes through `sendEmail`, so the transport, console mode and the
contact footer behave as for a real email. See [RELEASES.md](RELEASES.md)
§13. Every other new message goes through the door (section 8).

---

## 5. The timer

`src/instrumentation.ts` starts one interval when the Node server boots. It
ticks every `RELEASE_SWEEP_INTERVAL_MS` (1 minute) and calls
`runScheduledMessages` in `message-scheduler.service.ts`, which runs the
sweeps that are due on that tick:

1. **Every tick, first:** the three release stock sweeps, in this order:
   expired release holds (`expireHolds`), lapsed release orders
   (`closeLapsedReleaseOrders`) and ended releases
   (`completeEndedReleases`). They move stock and send no message of their
   own, except the usual Cancelled email of a lapsed order. They run first,
   so the release sequence reads stock that is up to date. See
   [RELEASES.md](RELEASES.md) §14.
2. **Every tick, then:** the release sequence (`sweepReleaseSequence` in
   `release-message.service.ts`), so a reminder or the drop live message
   leaves within about a minute of its time.
3. **Once per `MESSAGE_SWEEP_INTERVAL_MS` (5 minutes):** every other sweep,
   in this order: campaign messages, abandoned checkouts, review requests,
   warranty expiry notices, entitlement reminders, warranty follow ups and,
   last, the deletion of completed releases' waitlists.

How the choice is made:

1. An entry of `SWEEPS` with `everyTick: true` runs on every tick. The
   three stock sweeps and the release sequence have it.
2. `sweepsDueOnTick(sweeps, tick)` in `src/lib/messaging.ts` returns the
   sweeps for a tick: the every tick ones always, the rest when the tick
   number divides by `SLOW_SWEEP_EVERY_TICKS`. It is pure and tested in
   `messaging.test.ts`.
3. `SLOW_SWEEP_EVERY_TICKS` is `MESSAGE_SWEEP_INTERVAL_MS` divided by
   `RELEASE_SWEEP_INTERVAL_MS`, so 5. Change either constant and the cadence
   follows; no count is typed anywhere.
4. The tick number starts at 0, so the first tick after a start runs every
   sweep. That first tick comes one interval after the server boots.

What a quiet minute costs: the release sequence reads the `releases` table
twice, once for openings ahead inside the reminder window and once for
openings in the last hour, at most `MESSAGE_SWEEP_BATCH` rows each, and sends
nothing. That cost does not grow with the number of customers. Only a release
with a message due reads its waitlist. The three stock sweeps add one
bounded read each: lapsed holds on the `(status, expiresAt)` index, lapsed
orders on `(status, releaseHoldUntil)`, ended releases on
`(completedAt, endsAt)`.

The rules every sweep follows:

1. Each sweep reads a bounded window and sends at most `MESSAGE_SWEEP_BATCH`
   (50) per message type (per release for release messages). Anyone left is
   picked up by the next sweep.
2. A timed message is dropped, not sent late, once its moment is more than
   `MESSAGE_SCHEDULE_GRACE_MINUTES` (60) past (`isDue`). A server that was down
   never sends "1 hour to go" at the opening.
3. A sweep that fails is logged and the others still run. A tick that starts
   while another is still running does nothing (the `running` flag) and is
   not counted, so ticks never pile up behind a long send.
4. Nothing is sent when the event has not occurred: each sweep selects only
   records in the right state (published, confirmed, delivered, within the
   date window).
5. The stock sweeps are safe to run twice, on several servers too: every
   step is a guarded update, so the second run moves nothing
   ([RELEASES.md](RELEASES.md) §14).
6. The last sweep, `purgeEndedWaitlists`, sends nothing. It deletes the
   waitlist entries of completed releases for good, to keep the privacy
   policy's promise. `MessageLog` rows are kept. See
   [RELEASES.md](RELEASES.md) §13.

The two intervals are `RELEASE_SWEEP_INTERVAL_MS` and
`MESSAGE_SWEEP_INTERVAL_MS`. Windows and timings are constants in
`src/lib/constants.ts`:
`ABANDONED_CHECKOUT_AFTER_HOURS`, `ABANDONED_CHECKOUT_MAX_AGE_DAYS`,
`ABANDONED_CHECKOUT_COOLDOWN_DAYS`, `REVIEW_REQUEST_AFTER_DAYS`,
`RELEASE_HOLD_SWEEP_BATCH`, `RELEASE_LAPSED_ORDER_BATCH`,
`RELEASE_COMPLETE_BATCH`,
`REVIEW_REQUEST_MAX_AGE_DAYS`, `ENTITLEMENT_REMINDER_DAYS_BEFORE_END`,
`WARRANTY_EXPIRY_NOTICE_DAYS_BEFORE_END`, `WARRANTY_FOLLOW_UP_AFTER_DAYS`,
`WARRANTY_FOLLOW_UP_MAX_AGE_DAYS`, `RELEASE_REMINDER_LOOKAHEAD_DAYS`.

---

## 6. Admin

**Marketing, Marketing Messages** (`/admin/marketing/messages`): every message,
newest first, 20 a page. Filter by status, channel and message type, and
search the recipient, subject or record. Filter by Failed or Skipped to find
what did not go out; the Details column shows the reason.

**Users, Customers**: the envelope button on a customer row opens that
customer's history (messages to their account, or to their email or phone
from before they had an account).

API: `GET /api/v1/admin/messages` with `page`, `pageSize`, `userId`, `status`,
`channel`, `trigger`, `search`. Needs `PERMISSIONS.messages`
(`marketing.messages`, View only). The module appears on the Roles screen as
Marketing Messages. Hook: `useGetMessages` in `src/hooks/use-message.ts`.

**Order screen**: a Dispatched order shows **Delivery attempt failed**.
`POST /api/v1/admin/orders/[number]/delivery-attempt` with `{ note }` needs
Orders Edit, adds an order event ("Delivery attempt failed: …"), keeps the
status, and emails the customer. Each press is its own message.

---

## 7. Database and configuration

**Database.** New model `MessageLog` and enums `MessageChannel`,
`MessageStatus`, `MessageTrigger` in `prisma/schema/messaging.prisma`, plus
`User.messageLogs`. The migration is
`prisma/migrations/20261118054443_add_message_log`. On a database where it
has not been applied yet, no message is sent: the claim fails, the error is
logged to the console, the change that caused the message still goes through,
and the timer's sweeps log errors. `npx prisma migrate status` shows whether
it is pending, and `npm run db:deploy` applies it
([COMMANDS.md](COMMANDS.md) §4).

**WhatsApp credentials.** `getWhatsAppConfig()` in
`src/lib/whatsapp/send-whatsapp.ts` returns null, so every WhatsApp message
is recorded as Skipped ("WhatsApp isn't set up on this server"). Switching it
on needs the WhatsApp Business (Cloud API) access token and phone number id.
They are secrets, so by project rule they are env values, which needs approval
first. Once approved, read them in `src/lib/env.ts` (validated with Zod) and
return them from `getWhatsAppConfig()`; the Cloud API call is already written.
The three template names must also be approved in the WhatsApp Business
account.

**Timings** are constants, not admin settings. Making them editable by admin
would need columns on the store settings table (a migration). The one timing
staff do set is a release's reminder times, saved on the release itself
([RELEASES.md](RELEASES.md) §13).

**Test mode.** `TEST_MODE=true` changes only the default reminder times of
new releases, to 10 and 5 minutes. It does not change the timer, the batch
size or any other message ([INTEGRATIONS.md](INTEGRATIONS.md) §3a).

---

## 8. Adding a message

1. Add the trigger to the enum in `messaging.prisma` and to
   `MESSAGE_TRIGGER_LABELS` in `src/lib/messaging.ts`.
2. Write the content in `src/lib/email/message-templates.ts`, taking live data.
3. Call `dispatchEmail` from the service where the event happens (or add a
   sweep), with a `dedupeKey` made from the event's identity. A new sweep
   goes in `SWEEPS` and runs on the 5 minute cadence; give it
   `everyTick: true` only when a minute's delay matters and its quiet run is
   as cheap as the release sequence's (section 5).
4. Do not call `sendEmail` directly for customer messages. The release test
   emails do, because they go to staff and are not logged (section 4).

---

## 9. The branded order emails

Every email about an order uses the designed layout (`src/lib/email/order-layout.ts`,
filled by `order-email.ts`): order confirmation, payment received, dispatched,
delivered, cancelled, delivery attempt failed, device record, add-on summary,
review request, entitlement reminder and warranty expiry notice. The wording,
subject and badge (tick, warning or cross) follow the message (`copyFor` in
`order-email.ts`). Device records and add-on summaries add a list of the units
or add-ons above the order summary. The return, warranty claim, account and
release emails still use the plain layout.

Processing sends no email: `notifyOrderStatus` only emails Confirmed (payment
received), Dispatched, Delivered and Cancelled.

1. **Theme.** It uses the storefront's dark tokens from `globals.css` (void
   canvas, surface card, ink text, accent button) as plain inline colours, so
   it looks the same in every mail app and does not depend on dark mode.
2. **Content.** Items, add-ons, discount, delivery, VAT, totals, address,
   payment and placed date come from the placed order. The help block and
   footer come from the saved Contact & invoice details and show only what
   staff filled in. Nothing is typed in code.
3. **Images.** The logo and each product photo are sent inside the email as
   `cid:` images (`src/services/email-images.service.ts`), so they show even
   when the site address is private or tunnelled (an ngrok `APP_URL` blocks
   mail apps) or the app blocks remote images. A photo over
   `EMAIL_INLINE_IMAGE_MAX_BYTES` (300 KB) falls back to its web address. The
   logo file is `public/images/brand/email-logo-on-dark.png`.
4. **Footer.** `EmailContent.branded` stops `sendEmail` adding the plain
   contact footer on top, since the layout has its own.
5. **Fonts.** Geist loads from `{APP_URL}/fonts/Geist-VariableFont_wght.ttf`
   where the app allows web fonts, and falls back to Helvetica or Arial.

---

## 10. Known limits

1. The `ReleaseEmail` table from issue #108 is unused; `MessageLog` replaced it.
2. A server crash mid send leaves a row at Sending. It shows in the log and is
   not retried.
3. The sweep runs inside the web process. On several instances each runs it,
   and the unique key keeps it to one send.
4. Marketing email has no account level unsubscribe; waitlist emails carry the
   leave link.
5. A release reminder or drop live message reaches at most 3,000 people per
   release. A tick sends `MESSAGE_SWEEP_BATCH` (50) and the message is due
   for `MESSAGE_SCHEDULE_GRACE_MINUTES` (60) ticks; anyone beyond that is not
   sent it. A reminder set less than 60 minutes before the opening reaches
   fewer, since none is sent once the release has opened. Each tick also
   reads the addresses already handled for that message
   (`settledRecipients`), a list that grows with the waitlist.
6. Lifting that ceiling needs a bulk email service, which is separate work.
   Raising the two constants only moves the ceiling and makes each tick
   longer.
7. A release message leaves up to a minute after its time, and every other
   timed message up to 5 minutes after.
8. After a completed release's waitlist is deleted, its `MessageLog` rows
   still hold the recipient addresses.
