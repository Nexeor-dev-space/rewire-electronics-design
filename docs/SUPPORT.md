# Support Tickets

How staff manage customer support conversations in the admin console: the
ticket list, the ticket page, replies, assignment, status, priority, categories
and the emails that go out.

Read this before changing the Support Tickets screens, the support API, or the
ticket emails.

---

## 1. Scope

This covers the admin side only. The storefront support page
(`/support`) is still a contact page and nothing there creates a ticket.
Until a customer form exists, staff log a ticket on a customer's behalf with
New ticket, and record a customer's reply with "Log as a message from the
customer" on the ticket page. The service functions are written so a future
customer form can call the same code.

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

1. The migration has not been created. Once approved, run
   `npm run db:migrate -- --name add_support_tickets`, then `npm run db:seed`
   to add the default categories.
2. The Prisma client was regenerated locally so the code type checks. That does
   not touch the database.
3. Not built here: a customer ticket form, an account tickets screen, and
   emailing admins about new unassigned tickets.
