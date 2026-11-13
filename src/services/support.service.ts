import "server-only";

import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ServiceError, isUniqueViolation, type Paginated } from "@/lib/api/api-response";
import { appUrl } from "@/lib/app-url";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  MAX_TICKET_ASSIGNEES,
  MAX_TICKET_CATEGORIES,
  ORDER_EVENT_LIMIT,
  REFERENCE_NUMBER_ATTEMPTS,
  SUPPORT_CUSTOMER_HISTORY_LIMIT,
  SUPPORT_MESSAGE_LIMIT,
  SUPPORT_TICKET_NUMBER_PREFIX,
  ADMIN_SUPPORT_PATH,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import type { EmailContent } from "@/lib/email/email-outcome";
import { sendEmail } from "@/lib/email/send-email";
import { ticketEmailMessage } from "@/lib/email/templates";
import { generateReference } from "@/lib/reference-number";
import { getSupportInboxEmail } from "@/services/store-settings.service";
import {
  CUSTOMER_NOTIFIED_STATUSES,
  DEFAULT_TICKET_PRIORITY,
  TICKET_ASSIGNEE_ME,
  TICKET_ASSIGNEE_NONE,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  canReceiveMessages,
  isNewTicket,
  needsStaffReply,
  nextTicketStatuses,
  statusAfterMessage,
  type TicketPriority,
  type TicketSender,
  type TicketStatus,
} from "@/lib/support-tickets";
import type {
  TicketAssignee,
  TicketCategoryView,
  TicketDetail,
  TicketOrderSummary,
  TicketRow,
  TicketSibling,
} from "@/types/support";
import type {
  createTicketSchema,
  customerTicketSchema,
  ticketCategorySchema,
  ticketListQuerySchema,
  ticketMessageSchema,
} from "@/validators/support.validator";

type Tx = Prisma.TransactionClient;
type ListQuery = z.output<typeof ticketListQuerySchema>;
type CreateData = z.output<typeof createTicketSchema>;
type CustomerTicketData = z.output<typeof customerTicketSchema>;
type MessageData = z.output<typeof ticketMessageSchema>;
type CategoryData = z.output<typeof ticketCategorySchema>;

export interface TicketActor {
  id: string;
  fullName: string;
}

const MESSAGE_NOT_FOUND = "We couldn't find that ticket.";
const MESSAGE_CATEGORY_NOT_FOUND = "We couldn't find that category.";
const MESSAGE_TICKET_CHANGED = "This ticket changed. Refresh and try again.";
const MESSAGE_CLOSED = "A closed ticket can't take new messages.";
const MESSAGE_CHOOSE_CATEGORY = "Choose an active category.";
/** One message for an unknown order and someone else's, so the form cannot be used to probe order numbers. */
const MESSAGE_ORDER_UNKNOWN = "We couldn't find that order for this email address.";
const MESSAGE_ASSIGNEE_UNKNOWN = "Choose a staff member who can work on tickets.";
const MESSAGE_ASSIGN_FORBIDDEN = "Only someone with Full access can assign a ticket to someone else.";
const MESSAGE_REASSIGN_FORBIDDEN = "This ticket is assigned to someone else. Only someone with Full access can reassign it.";
const MESSAGE_CATEGORY_LIMIT = `You can have up to ${MAX_TICKET_CATEGORIES} categories.`;
const MESSAGE_CATEGORY_TAKEN = "A category with this name already exists.";
const UNASSIGNED_LABEL = "Unassigned";

/* ---------- selects and mapping ---------- */

const rowSelect = {
  number: true,
  subject: true,
  customerName: true,
  customerEmail: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  lastCustomerMessageAt: true,
  lastStaffReplyAt: true,
  category: { select: { name: true } },
  order: { select: { number: true } },
  assignee: { select: { id: true, fullName: true } },
} satisfies Prisma.SupportTicketSelect;

const newestFirst = [{ createdAt: "desc" }, { id: "desc" }] satisfies Prisma.TicketMessageOrderByWithRelationInput[];

const detailSelect = {
  ...rowSelect,
  id: true,
  categoryId: true,
  customerId: true,
  customer: { select: { id: true, fullName: true, email: true, phone: true } },
  order: { select: { number: true, total: true, status: true, createdAt: true } },
  _count: { select: { messages: true } },
  messages: {
    select: { id: true, sender: true, body: true, createdAt: true, author: { select: { fullName: true } } },
    orderBy: newestFirst,
    take: SUPPORT_MESSAGE_LIMIT,
  },
  events: {
    select: {
      type: true,
      fromValue: true,
      toValue: true,
      createdAt: true,
      actor: { select: { fullName: true } },
    },
    orderBy: newestFirst,
    take: ORDER_EVENT_LIMIT,
  },
} satisfies Prisma.SupportTicketSelect;

type RowData = Prisma.SupportTicketGetPayload<{ select: typeof rowSelect }>;
type DetailData = Prisma.SupportTicketGetPayload<{ select: typeof detailSelect }>;

const orderSummarySelect = {
  number: true,
  total: true,
  status: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;

function toRow(row: RowData, now: Date): TicketRow {
  return {
    number: row.number,
    subject: row.subject,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    orderNumber: row.order?.number ?? null,
    categoryName: row.category.name,
    assigneeId: row.assignee?.id ?? null,
    assigneeName: row.assignee?.fullName ?? null,
    priority: row.priority,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isNew: isNewTicket(row.createdAt, now),
    needsReply: needsStaffReply(row),
  };
}

function toOrderSummary(order: { number: string; total: number; status: TicketOrderSummary["status"]; createdAt: Date }) {
  return {
    number: order.number,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  } satisfies TicketOrderSummary;
}

function toDetail(
  row: DetailData,
  customerOrders: TicketOrderSummary[],
  customerTickets: TicketSibling[],
): TicketDetail {
  return {
    ...toRow(row, new Date()),
    categoryId: row.categoryId,
    customer: row.customer,
    order: row.order ? toOrderSummary(row.order) : null,
    messages: row.messages
      .map((message) => ({
        id: message.id,
        sender: message.sender,
        authorName: message.author?.fullName ?? null,
        body: message.body,
        at: message.createdAt.toISOString(),
      }))
      .reverse(),
    messageCount: row._count.messages,
    events: row.events
      .map((event) => ({
        type: event.type,
        from: event.fromValue,
        to: event.toValue,
        actorName: event.actor?.fullName ?? null,
        at: event.createdAt.toISOString(),
      }))
      .reverse(),
    nextStatuses: nextTicketStatuses(row.status),
    canReceiveMessages: canReceiveMessages(row.status),
    customerOrders,
    customerTickets,
  };
}

export function ticketAuditView(detail: TicketDetail) {
  return {
    status: detail.status,
    priority: detail.priority,
    category: detail.categoryName,
    assignee: detail.assigneeName,
  };
}

/* ---------- errors ---------- */

function ticketNotFound() {
  return new ServiceError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);
}

function conflict(message: string, field?: string) {
  return new ServiceError("CONFLICT", message, 409, field ? { [field]: [message] } : undefined);
}

function invalid(field: string, message: string) {
  return new ServiceError("VALIDATION", message, 422, { [field]: [message] });
}

/* ---------- notifications ---------- */

/** Email is best effort: a failed send is logged and never undoes a saved change. */
async function notify(to: string, content: EmailContent) {
  try {
    await sendEmail({ to, ...content });
  } catch (error) {
    console.error("support notification failed", error);
  }
}

async function staffTicketUrl(number: string): Promise<string | undefined> {
  try {
    return await appUrl(`${ADMIN_SUPPORT_PATH}/${number}`);
  } catch {
    return undefined;
  }
}

/** A new ticket from the storefront form also lands in the shared support mailbox. */
async function notifySupportInbox(ticket: TicketRef & { message: string }) {
  await notify(
    await getSupportInboxEmail(),
    ticketEmailMessage({
      name: "team",
      number: ticket.number,
      subject: ticket.subject,
      intro: `${ticket.customerName} (${ticket.customerEmail}) raised a support ticket.`,
      quote: ticket.message,
      url: await staffTicketUrl(ticket.number),
    }),
  );
}

async function notifyAssigned(assignee: { fullName: string; email: string }, ticket: TicketRef) {
  await notify(
    assignee.email,
    ticketEmailMessage({
      name: assignee.fullName,
      number: ticket.number,
      subject: ticket.subject,
      intro: "A support ticket was assigned to you.",
      url: await staffTicketUrl(ticket.number),
    }),
  );
}

async function notifyCustomerReply(ticket: TicketRef, staffName: string, body: string) {
  await notify(
    ticket.customerEmail,
    ticketEmailMessage({
      name: ticket.customerName,
      number: ticket.number,
      subject: ticket.subject,
      intro: `${staffName} replied to your support request.`,
      quote: body,
    }),
  );
}

async function notifyStaffOfReply(assignee: { fullName: string; email: string }, ticket: TicketRef, body: string) {
  await notify(
    assignee.email,
    ticketEmailMessage({
      name: assignee.fullName,
      number: ticket.number,
      subject: ticket.subject,
      intro: `${ticket.customerName} replied to a ticket assigned to you.`,
      quote: body,
      url: await staffTicketUrl(ticket.number),
    }),
  );
}

async function notifyCustomerStatus(ticket: TicketRef, status: TicketStatus) {
  if (!(CUSTOMER_NOTIFIED_STATUSES as readonly TicketStatus[]).includes(status)) return;
  await notify(
    ticket.customerEmail,
    ticketEmailMessage({
      name: ticket.customerName,
      number: ticket.number,
      subject: ticket.subject,
      intro: `Your support request is now ${TICKET_STATUS_LABELS[status].toLowerCase()}.`,
    }),
  );
}

interface TicketRef {
  number: string;
  subject: string;
  customerName: string;
  customerEmail: string;
}

const refSelect = {
  id: true,
  number: true,
  subject: true,
  customerName: true,
  customerEmail: true,
  status: true,
} satisfies Prisma.SupportTicketSelect;

/* ---------- reads ---------- */

function searchWhere(search: string | undefined): Prisma.SupportTicketWhereInput {
  if (!search) return {};
  const contains = { contains: search, mode: "insensitive" } as const;
  return {
    OR: [{ number: contains }, { customerName: contains }, { customerEmail: contains }, { subject: contains }],
  };
}

function assigneeWhere(assignee: string | undefined, viewerId: string): Prisma.SupportTicketWhereInput {
  if (!assignee) return {};
  if (assignee === TICKET_ASSIGNEE_NONE) return { assigneeId: null };
  return { assigneeId: assignee === TICKET_ASSIGNEE_ME ? viewerId : assignee };
}

function orderBy(sort: ListQuery["sort"]): Prisma.SupportTicketOrderByWithRelationInput[] {
  const [field, direction] = sort.split("_") as ["updated" | "created", "asc" | "desc"];
  return [{ [field === "updated" ? "updatedAt" : "createdAt"]: direction }, { id: direction }];
}

export async function listTickets(
  viewerId: string,
  { page, pageSize, search, status, priority, categoryId, assignee, sort }: ListQuery,
): Promise<Paginated<TicketRow>> {
  const where: Prisma.SupportTicketWhereInput = {
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...assigneeWhere(assignee, viewerId),
    ...searchWhere(search),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.supportTicket.findMany({
      where,
      select: rowSelect,
      orderBy: orderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supportTicket.count({ where }),
  ]);
  const now = new Date();
  return { items: rows.map((row) => toRow(row, now)), page, pageSize, total };
}

export async function getTicket(number: string): Promise<TicketDetail> {
  const row = await prisma.supportTicket.findUnique({ where: { number }, select: detailSelect });
  if (!row) throw ticketNotFound();

  const [orders, siblings] = await Promise.all([
    row.customerId
      ? prisma.order.findMany({
          where: { userId: row.customerId },
          select: orderSummarySelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: SUPPORT_CUSTOMER_HISTORY_LIMIT,
        })
      : Promise.resolve([]),
    prisma.supportTicket.findMany({
      where: { customerEmail: row.customerEmail, NOT: { id: row.id } },
      select: { number: true, subject: true, status: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: SUPPORT_CUSTOMER_HISTORY_LIMIT,
    }),
  ]);

  return toDetail(
    row,
    orders.map(toOrderSummary),
    siblings.map((sibling) => ({ ...sibling, createdAt: sibling.createdAt.toISOString() })),
  );
}

/* ---------- create ---------- */

/** `linkAccount` ties the ticket to the customer account that owns the email. Staff vouch for the email; a form visitor must prove it. */
async function createInTransaction(tx: Tx, data: CreateData, actorId: string | null, linkAccount: boolean) {
  const email = data.customerEmail;

  const category = await tx.ticketCategory.findFirst({
    where: { id: data.categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) throw invalid("categoryId", MESSAGE_CHOOSE_CATEGORY);

  const customer = linkAccount
    ? await tx.user.findFirst({
        where: { email, role: "CUSTOMER", state: "ACTIVE" },
        select: { id: true, fullName: true },
      })
    : null;

  let orderId: string | undefined;
  if (data.orderNumber) {
    const order = await tx.order.findUnique({
      where: { number: data.orderNumber },
      select: { id: true, userId: true, email: true },
    });
    if (!order) throw invalid("orderNumber", MESSAGE_ORDER_UNKNOWN);
    const ownedByCustomer = order.email.toLowerCase() === email || (customer && order.userId === customer.id);
    if (!ownedByCustomer) throw invalid("orderNumber", MESSAGE_ORDER_UNKNOWN);
    orderId = order.id;
  }

  const now = new Date();
  return tx.supportTicket.create({
    data: {
      number: generateReference(SUPPORT_TICKET_NUMBER_PREFIX),
      subject: data.subject,
      priority: data.priority,
      category: { connect: { id: category.id } },
      customerName: customer?.fullName ?? data.customerName,
      customerEmail: email,
      ...(customer ? { customer: { connect: { id: customer.id } } } : {}),
      ...(orderId ? { order: { connect: { id: orderId } } } : {}),
      lastCustomerMessageAt: now,
      messages: { create: { sender: "CUSTOMER", body: data.message } },
      events: { create: { type: "CREATED", toValue: TICKET_STATUS_LABELS.OPEN, actorId } },
    },
    select: { number: true },
  });
}

async function createWithRetry(data: CreateData, actorId: string | null, linkAccount: boolean): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const { number } = await prisma.$transaction((tx) => createInTransaction(tx, data, actorId, linkAccount));
      return number;
    } catch (error) {
      if (!isUniqueViolation(error) || attempt >= REFERENCE_NUMBER_ATTEMPTS) throw error;
    }
  }
}

/** Staff log a ticket for a customer who wrote, called or emailed instead of using a form. */
export async function createTicket(data: CreateData, actorId: string): Promise<TicketDetail> {
  return getTicket(await createWithRetry(data, actorId, true));
}

/**
 * A customer raises a ticket from the storefront form. The result holds only the
 * number, never staff data, and `notifySupport` emails the support inbox so the
 * caller can send it after the response. The ticket is linked to a customer
 * account only when the signed in user's email is the one typed, so nobody can
 * attach a ticket to someone else's account by typing their address.
 */
export async function submitCustomerTicket(data: CustomerTicketData, signedInEmail: string | null) {
  const linkAccount = signedInEmail?.toLowerCase() === data.customerEmail;
  const number = await createWithRetry({ ...data, priority: DEFAULT_TICKET_PRIORITY }, null, linkAccount);
  return {
    result: { number },
    notifySupport: () =>
      notifySupportInbox({
        number,
        subject: data.subject,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        message: data.message,
      }),
  };
}

/* ---------- messages ---------- */

export async function addTicketMessage(
  number: string,
  { body, from }: MessageData,
  actor: TicketActor,
): Promise<TicketDetail> {
  const ticket = await prisma.$transaction(async (tx) => {
    const row = await tx.supportTicket.findUnique({
      where: { number },
      select: { ...refSelect, assignee: { select: { fullName: true, email: true } } },
    });
    if (!row) throw ticketNotFound();
    if (!canReceiveMessages(row.status)) throw conflict(MESSAGE_CLOSED);

    const now = new Date();
    const next = statusAfterMessage(row.status, from);
    await tx.ticketMessage.create({
      data: { ticketId: row.id, sender: from, authorId: from === "STAFF" ? actor.id : null, body },
    });
    await tx.supportTicket.update({
      where: { id: row.id },
      data: {
        ...(from === "STAFF" ? { lastStaffReplyAt: now } : { lastCustomerMessageAt: now }),
        ...(next ? { status: next } : {}),
      },
    });
    if (next) {
      await tx.ticketEvent.create({
        data: {
          ticketId: row.id,
          type: "STATUS",
          fromValue: TICKET_STATUS_LABELS[row.status],
          toValue: TICKET_STATUS_LABELS[next],
          actorId: from === "STAFF" ? actor.id : null,
        },
      });
    }
    return row;
  });

  await notifyAboutMessage(ticket, from, actor, body);
  return getTicket(number);
}

async function notifyAboutMessage(
  ticket: TicketRef & { assignee: { fullName: string; email: string } | null },
  from: TicketSender,
  actor: TicketActor,
  body: string,
) {
  if (from === "STAFF") return notifyCustomerReply(ticket, actor.fullName, body);
  if (ticket.assignee) return notifyStaffOfReply(ticket.assignee, ticket, body);
}

/* ---------- status, priority, assignment ---------- */

export async function changeTicketStatus(number: string, to: TicketStatus, actorId: string): Promise<TicketDetail> {
  const ticket = await prisma.$transaction(async (tx) => {
    const row = await tx.supportTicket.findUnique({ where: { number }, select: refSelect });
    if (!row) throw ticketNotFound();
    if (!nextTicketStatuses(row.status).includes(to)) {
      const message = `A ${TICKET_STATUS_LABELS[row.status].toLowerCase()} ticket can't move to ${TICKET_STATUS_LABELS[to].toLowerCase()}.`;
      throw conflict(message, "status");
    }

    const { count } = await tx.supportTicket.updateMany({
      where: { id: row.id, status: row.status },
      data: { status: to },
    });
    if (count === 0) throw conflict(MESSAGE_TICKET_CHANGED);

    await tx.ticketEvent.create({
      data: {
        ticketId: row.id,
        type: "STATUS",
        fromValue: TICKET_STATUS_LABELS[row.status],
        toValue: TICKET_STATUS_LABELS[to],
        actorId,
      },
    });
    return row;
  });

  await notifyCustomerStatus(ticket, to);
  return getTicket(number);
}

export async function changeTicketPriority(
  number: string,
  to: TicketPriority,
  actorId: string,
): Promise<TicketDetail> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.supportTicket.findUnique({ where: { number }, select: { id: true, priority: true } });
    if (!row) throw ticketNotFound();
    if (row.priority === to) return;

    await tx.supportTicket.update({ where: { id: row.id }, data: { priority: to } });
    await tx.ticketEvent.create({
      data: {
        ticketId: row.id,
        type: "PRIORITY",
        fromValue: TICKET_PRIORITY_LABELS[row.priority],
        toValue: TICKET_PRIORITY_LABELS[to],
        actorId,
      },
    });
  });
  return getTicket(number);
}

/** Staff who can work tickets: every Admin, and Staff whose role holds the Support module. */
const assigneeFilter: Prisma.UserWhereInput = {
  state: "ACTIVE",
  OR: [
    { role: "ADMIN" },
    { role: "STAFF", staffRole: { permissions: { some: { module: PERMISSIONS.support } } } },
  ],
};

export async function listAssignees(): Promise<TicketAssignee[]> {
  return prisma.user.findMany({
    where: assigneeFilter,
    select: { id: true, fullName: true },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    take: MAX_TICKET_ASSIGNEES,
  });
}

/**
 * `assigneeId` is a staff id, "me" or null. Full access assigns to anyone and
 * unassigns; Edit access can only take an unassigned ticket for themselves.
 */
export async function assignTicket(
  number: string,
  assigneeId: string | null,
  actor: TicketActor,
  canAssignAny: boolean,
): Promise<TicketDetail> {
  const target = assigneeId === TICKET_ASSIGNEE_ME ? actor.id : assigneeId;

  const assigned = await prisma.$transaction(async (tx) => {
    const row = await tx.supportTicket.findUnique({
      where: { number },
      select: { id: true, assigneeId: true, assignee: { select: { fullName: true } } },
    });
    if (!row) throw ticketNotFound();
    if (row.assigneeId === target) return null;

    if (!canAssignAny) {
      if (target !== actor.id) throw new ServiceError("FORBIDDEN", MESSAGE_ASSIGN_FORBIDDEN, 403);
      if (row.assigneeId) throw new ServiceError("FORBIDDEN", MESSAGE_REASSIGN_FORBIDDEN, 403);
    }

    const assignee = target
      ? await tx.user.findFirst({
          where: { id: target, ...assigneeFilter },
          select: { id: true, fullName: true, email: true },
        })
      : null;
    if (target && !assignee) throw invalid("assigneeId", MESSAGE_ASSIGNEE_UNKNOWN);

    await tx.supportTicket.update({ where: { id: row.id }, data: { assigneeId: assignee?.id ?? null } });
    await tx.ticketEvent.create({
      data: {
        ticketId: row.id,
        type: "ASSIGNMENT",
        fromValue: row.assignee?.fullName ?? UNASSIGNED_LABEL,
        toValue: assignee?.fullName ?? UNASSIGNED_LABEL,
        actorId: actor.id,
      },
    });
    return assignee;
  });

  if (assigned && assigned.id !== actor.id) {
    const detail = await getTicket(number);
    await notifyAssigned(assigned, detail);
    return detail;
  }
  return getTicket(number);
}

/* ---------- categories ---------- */

const categorySelect = { id: true, name: true, isActive: true } satisfies Prisma.TicketCategorySelect;

export async function listCategories(): Promise<TicketCategoryView[]> {
  return prisma.ticketCategory.findMany({
    select: categorySelect,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: MAX_TICKET_CATEGORIES,
  });
}

/** The categories a customer can pick on the storefront form. */
export async function listActiveCategories(): Promise<Pick<TicketCategoryView, "id" | "name">[]> {
  return prisma.ticketCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: MAX_TICKET_CATEGORIES,
  });
}

export async function createCategory({ name, isActive }: CategoryData): Promise<TicketCategoryView> {
  const count = await prisma.ticketCategory.count();
  if (count >= MAX_TICKET_CATEGORIES) throw conflict(MESSAGE_CATEGORY_LIMIT);
  try {
    return await prisma.ticketCategory.create({
      data: { name, nameKey: name.toLowerCase(), isActive, sortOrder: count },
      select: categorySelect,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw invalid("name", MESSAGE_CATEGORY_TAKEN);
    throw error;
  }
}

export async function updateCategory(id: string, { name, isActive }: CategoryData): Promise<TicketCategoryView> {
  const existing = await prisma.ticketCategory.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new ServiceError("NOT_FOUND", MESSAGE_CATEGORY_NOT_FOUND, 404);
  try {
    return await prisma.ticketCategory.update({
      where: { id },
      data: { name, nameKey: name.toLowerCase(), isActive },
      select: categorySelect,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw invalid("name", MESSAGE_CATEGORY_TAKEN);
    throw error;
  }
}
