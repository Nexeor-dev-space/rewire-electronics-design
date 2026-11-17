# Support Tickets

How staff manage customer support conversations in the admin console: the
ticket list, the ticket page, replies, assignment, status, priority, categories
and the ticket history.

Read this before changing the Support Tickets screens or the support API.

Support tickets send one email: a "ticket raised" confirmation to the customer
when they raise a ticket on the storefront form (section 7). The ticket is saved
and shown in the admin list at once. Staff are not emailed.

---

## 1. Scope

This covers the admin screens and one customer entry point.

1. Admin: the ticket list and ticket page under `/admin/support`. Staff can also
   log a ticket on a customer's behalf with New ticket. The ticket page has no
   reply box: staff contact the customer by email, WhatsApp or phone.
2. Customer: the page `/support/ticket` (`SUPPORT_TICKET_PAGE_PATH`) holds a
   form that creates a ticket. It is linked from the contact page at `/support`,
   which is otherwise unchanged. Customers cannot yet see or reply to their
   tickets; that screen is not built.

The customer form calls `submitCustomerTicket`, which reuses the same creation
code as staff. The customer cannot choose the priority: it starts at
`DEFAULT_TICKET_PRIORITY` (Medium) and staff change it.

---

## 2. Files

| File | Purpose |
| --- | --- |
| `prisma/schema/support.prisma` | `TicketCategory`, `SupportTicket`, `TicketMessage`, `TicketEvent` and their enums |
| `prisma/seed-ticket-categories.ts` | Seeds the seven default categories, wired into `prisma/seed.ts` |
| `src/lib/support-tickets.ts` | Statuses, priorities, labels, the status transitions, the reply rules (client safe). Not `src/lib/support.ts`, which holds the storefront support page content |
| `src/validators/support.validator.ts` | Zod schemas for every ticket input |
| `src/types/support.ts` | `TicketRow`, `TicketDetail`, `TicketCategoryView` and the input types |
| `src/services/support.service.ts` | All ticket logic |
| `src/app/api/v1/admin/support/` | The API (section 6) |
| `src/hooks/use-support.ts` | React Query hooks |
| `src/app/admin/support/`, `src/components/admin/support/` | The list page, the ticket page and the dialogs |
| `src/app/(site)/support/ticket/page.tsx`, `src/components/support/ticket-form.tsx` | The customer ticket page and its form |
| `src/app/api/v1/support/` | The public API for the customer form (section 6) |

---

## 3. Data model

1. `SupportTicket`: number (`TK-` plus 8 digits), subject, status, priority,
   category, customer (optional account plus a kept name, email and optional phone), optional
   order, optional assignee, and `lastCustomerMessageAt` and
   `lastStaffReplyAt` which drive the "Awaiting reply" highlight.
2. `TicketMessage`: the conversation. `sender` is CUSTOMER or STAFF; `authorId`
   is the staff member for staff messages.
3. `TicketEvent`: the history of creation, status, priority and assignment
   changes, with readable from and to text and the actor.
4. `TicketCategory`: managed by Admins. Categories are deactivated, never
   deleted, so old tickets keep theirs.

The tables need a migration, which has not been generated yet. See section 9.

---

## 4. Statuses

Open, In progress, Waiting for customer, Resolved, Closed.

1. Open can move to any status except itself.
2. In progress can move to Waiting for customer, Resolved or Closed.
3. Waiting for customer can move to In progress, Resolved or Closed.
4. Resolved can be reopened to Open, or Closed.
5. Closed is final and takes no new messages.

A message can move the status on its own: a staff reply on an Open ticket makes
it In progress; a customer message on a Waiting ticket makes it In progress;
a customer message on a Resolved ticket reopens it. The rules live in
`nextTicketStatuses` and `statusAfterMessage`.

---

## 5. Permissions

Module key `service.support`, added in `src/lib/auth/permissions.ts`.

| Level | What it allows |
| --- | --- |
| View | See every ticket, read only. The "Assigned to me" filter lists a person's own tickets |
| Edit | Create tickets, reply, change status and priority, take an unassigned ticket for themselves |
| Full access | Also assign or reassign to anyone, unassign, and manage categories |

Full access maps to the DELETE action here, which gates assignment to others
and category management. The API enforces every rule; the buttons are hidden as
a courtesy. Admins hold everything.

---

## 6. API

All routes are under `/api/v1/admin/support`, return through `apiSuccess` and
`apiError`, and are listed in `src/lib/api/api-endpoints.ts`.

| Route | Action needed | What it does |
| --- | --- | --- |
| `GET /` | VIEW | Paginated list. Query: `page`, `pageSize`, `search`, `status`, `priority`, `categoryId`, `assignee` (a staff id, `me` or `unassigned`), `sort` |
| `POST /` | CREATE | Create a ticket. Body: `customerName`, `customerEmail`, `customerPhone` (optional), `subject`, `categoryId`, `priority`, `orderNumber` (optional), `message` |
| `GET /[number]` | VIEW | The ticket with messages, history, customer, related order, recent orders and other tickets |
| `POST /[number]/messages` | EDIT | Body: `body`, `from` (`STAFF` or `CUSTOMER`) |
| `PATCH /[number]/status` | EDIT | Body: `status` |
| `PATCH /[number]/priority` | EDIT | Body: `priority` |
| `PATCH /[number]/assignee` | EDIT | Body: `assigneeId` (a staff id, `me` or null). Full access needed for anyone but yourself |
| `GET /assignees` | VIEW | Staff who can work tickets: Admins, and Staff whose role holds Support |
| `GET /categories` | VIEW | All categories |
| `POST /categories`, `PATCH /categories/[id]` | DELETE | Add, rename or deactivate a category |

The customer form uses two public routes under `/api/v1/support`. They need no
sign in, because guests can raise tickets.

| Route | What it does |
| --- | --- |
| `GET /categories` | Active categories for the dropdown, as `id` and `name` |
| `POST /tickets` | Body: `customerName`, `customerEmail`, `customerPhone` (optional), `categoryId`, `orderNumber` (optional), `subject`, `message`. Returns only `{ number }`. Rate limited to 5 per hour per person or address (`RATE_LIMITS.createSupportTicket`) |

An unknown order and an order that belongs to someone else give the same
message, so the form cannot be used to check which order numbers exist. The
limit applies twice, once per address and once per customer email, because a
script can change its address.

A ticket from the form is linked to a customer account only when the signed in
customer's email is the one typed. A visitor who types someone else's email gets
an unlinked ticket, so staff never see that person's orders or history on it.
Tickets staff log by hand are linked by email as before.

Search matches the ticket number, customer name, customer email, customer phone and subject.
A ticket is linked to a customer account when the email belongs to an active
Customer, and an order must belong to that customer or carry the same email.
Changes are written to the change log through `recordAudit`.

---

## 7. The one email

When a customer raises a ticket on `/support/ticket`, `POST /api/v1/support/tickets`
saves it and, after the response, `notifyCustomer` sends them one email through the
existing `sendEmail` (SMTP, the same setup as sign up and orders; Resend works
through SMTP as set out in `docs/INTEGRATIONS.md`). No new environment variable.

1. Template: `ticketReceivedMessage` in `src/lib/email/templates.ts`. Subject
   `Ticket <number> raised successfully`. Body: the ticket number and subject, "We
   will look into it", and a line saying it is automated and not to reply. It has
   no links. `sendEmail` adds the saved support contact footer.
2. It is sent from the `EMAIL_FROM` address. For a true no reply mailbox, point
   `EMAIL_FROM` at a no reply address on the verified domain.
3. It is best effort: a failed send is logged (`support ticket email failed`) and
   never fails the form or undoes the ticket.
4. Only the storefront form sends it. A ticket staff log with New ticket sends
   nothing, and nothing else on a ticket sends email: not assignment, status
   changes or messages.

---

## 8. Screens

1. List: search, filters for status, priority, category and assigned staff,
   sort by created or last updated, pagination. The filters sit in an even
   grid. New tickets (under a day old) and tickets awaiting a staff reply are
   highlighted; resolved and closed rows are muted; rows have a hover state.
   From `xl` up it is a seven column table (`COLUMNS` in
   `support-management.tsx`): ticket, customer, category with order,
   assignee, status with priority, dates, and actions. Subject, customer and
   email wrap instead of being cut off. Actions are two full width compact
   buttons, View and Assign (Assign needs Edit). There is no separate Edit
   button, since it opened the same page as View. Under `xl` each row is a two
   column card and every value shows its own label (`Cell`).
2. Ticket page: a Request details list of what the customer filled in (name,
   email, phone, subject, category, related order), the message, history, a
   Manage panel for status, priority and assignment, ticket details, and the
   customer's history (recent orders and other tickets).
   `src/components/admin/support/contact-actions.tsx` holds two helpers. The
   email opens the mail app (`mailto:`) with the subject `Re: <subject>
   [<number>]`. The phone number opens two options: Message on WhatsApp (a
   `wa.me` link with `SUPPORT_STAFF_WHATSAPP_GREETING` and the ticket number)
   and Call this number (`tel:`). The phone shown is the ticket's, else the
   linked account's. `POST /[number]/messages` remains in the API but the
   screen no longer uses it.
3. Loading, empty, error and validation states are handled on both.

---

## 9. Database and follow up work

1. Both migrations exist: `add_support_tickets` and `add_support_inbox_email`.
   Run `npm run db:deploy` where they are not yet applied, then `npm run db:seed`
   once to add the default categories. The nullable column
   `store_settings.supportInboxEmail` is no longer read or written. It stays in
   the database until a migration drops it, which needs approval first.
2. The Prisma client was regenerated locally so the code type checks. That does
   not touch the database.
3. The customer form needed no new columns: its fields map to the existing
   ticket, message and category tables.
4. `customerPhone` (nullable text on `support_tickets`) holds the optional phone
   from the customer form or the staff New ticket dialog. It goes through
   `optionalPhoneValidator` (+971 and +966 only, docs/PHONE-NUMBERS.md) and the
   `PhoneField`. The ticket page shows it under the customer's email, falling
   back to the account's phone. The migration `add_ticket_customer_phone` must be
   run before this code is deployed.
5. Not built here: an account tickets screen where customers follow and reply
   to a ticket.
