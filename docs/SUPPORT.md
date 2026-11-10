# Support Tickets

How staff manage customer support conversations in the admin console: the
ticket list, the ticket page, replies, assignment, status, priority, categories
and the emails that go out.

Read this before changing the Support Tickets screens, the support API, or the
ticket emails.

---

## 1. Scope

This covers the admin screens and one customer entry point.

1. Admin: the ticket list and ticket page under `/admin/support`. Staff can also
   log a ticket on a customer's behalf with New ticket, and record a customer's
   reply with "Log as a message from the customer" on the ticket page.
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
| `src/services/support.service.ts` | All ticket logic and the notification emails |
| `src/lib/email/templates.ts` | `ticketEmailMessage` |
| `src/app/api/v1/admin/support/` | The API (section 6) |
| `src/hooks/use-support.ts` | React Query hooks |
| `src/app/admin/support/`, `src/components/admin/support/` | The list page, the ticket page and the dialogs |
| `src/app/(site)/support/ticket/page.tsx`, `src/components/support/ticket-form.tsx` | The customer ticket page and its form |
| `src/app/api/v1/support/` | The public API for the customer form (section 6) |

---

## 3. Data model

1. `SupportTicket`: number (`TK-` plus 8 digits), subject, status, priority,
   category, customer (optional account plus a kept name and email), optional
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
| `POST /` | CREATE | Create a ticket. Body: `customerName`, `customerEmail`, `subject`, `categoryId`, `priority`, `orderNumber` (optional), `message` |
| `GET /[number]` | VIEW | The ticket with messages, history, customer, related order, recent orders and other tickets |
| `POST /[number]/messages` | EDIT | Body: `body`, `from` (`STAFF` or `CUSTOMER`) |
| `PATCH /[number]/status` | EDIT | Body: `status` |
| `PATCH /[number]/priority` | EDIT | Body: `priority` |
| `PATCH /[number]/assignee` | EDIT | Body: `assigneeId` (a staff id, `me` or null). Full access needed for anyone but yourself |
| `GET /assignees` | VIEW | Staff who can work tickets: Admins, and Staff whose role holds Support |
| `GET /categories` | VIEW | All categories |
| `POST /categories`, `PATCH /categories/[id]` | DELETE | Add, rename or deactivate a category |
| `GET /settings`, `PUT /settings` | DELETE | Read or change the support inbox email. Body: `inboxEmail` |

The customer form uses two public routes under `/api/v1/support`. They need no
sign in, because guests can raise tickets.

| Route | What it does |
| --- | --- |
| `GET /categories` | Active categories for the dropdown, as `id` and `name` |
| `POST /tickets` | Body: `customerName`, `customerEmail`, `categoryId`, `orderNumber` (optional), `subject`, `message`. Returns only `{ number }`. Rate limited to 5 per hour per person or address (`RATE_LIMITS.createSupportTicket`) |

An unknown order and an order that belongs to someone else give the same
message, so the form cannot be used to check which order numbers exist. The
limit applies twice, once per address and once per customer email, because a
script can change its address.

A ticket from the form is linked to a customer account only when the signed in
customer's email is the one typed. A visitor who types someone else's email gets
an unlinked ticket, so staff never see that person's orders or history on it.
Tickets staff log by hand are linked by email as before.

Search matches the ticket number, customer name, customer email and subject.
A ticket is linked to a customer account when the email belongs to an active
Customer, and an order must belong to that customer or carry the same email.
Changes are written to the change log through `recordAudit`.

---

## 7. Emails

Sent through the existing `sendEmail` (SMTP; Resend works through SMTP as set
out in `docs/INTEGRATIONS.md`). No new environment variable.

1. Assigned: the new assignee, unless they assigned it to themselves.
2. Staff reply: the customer, with the reply quoted.
3. Customer message: the assignee. An unassigned ticket has nobody to tell.
4. Status change: the customer, only for Waiting for customer, Resolved and
   Closed.
5. New ticket from the storefront form: the support inbox address, with the
   customer's name,
   email, message and a link to the ticket. The ticket is also saved, so it
   appears in the admin Support Tickets list at the same moment. The email is
   sent after the response, so a mail failure never fails the form.

The support inbox address is stored in the database, column
`StoreSettings.supportInboxEmail`, so the client changes it without a developer.
An Admin, or Staff with Full access to Support Tickets, opens Support Tickets,
Inbox, and saves a new address. Until one is saved, the default
`SUPPORT_TICKET_INBOX` in `src/lib/constants.ts` is used. The change is written
to the change log. The sender address stays `EMAIL_FROM` in the environment,
because it must belong to the domain verified with the mail provider.

An email is sent once, after the change is saved, and only when something
actually changed. A failed send is logged and never undoes the change.

---

## 8. Screens

1. List: search, filters for status, priority, category and assigned staff,
   sort by created or last updated, pagination. New tickets (under a day old)
   and tickets awaiting a staff reply are highlighted; resolved and closed
   rows are muted.
2. Ticket page: conversation and reply box, history, a Manage panel for status,
   priority and assignment, ticket details, and the customer with recent orders
   and other tickets.
3. Loading, empty, error and validation states are handled on both.

---

## 9. Database and follow up work

1. Both migrations exist: `add_support_tickets` and `add_support_inbox_email`
   (the nullable column `store_settings.supportInboxEmail`). Run
   `npm run db:deploy` where they are not yet applied, then `npm run db:seed`
   once to add the default categories.
   Before launch, save the real address in Support Tickets, Inbox. The default
   in `SUPPORT_TICKET_INBOX` is a test address.
2. The Prisma client was regenerated locally so the code type checks. That does
   not touch the database.
3. The customer form needed no new columns: its fields map to the existing
   ticket, message and category tables.
4. Not built here: an account tickets screen where customers follow and reply
   to a ticket, and a confirmation email to the customer on submit.
