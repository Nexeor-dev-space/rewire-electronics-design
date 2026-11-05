import { ADMIN_SUPPORT_PATH, MS_PER_HOUR, SUPPORT_NEW_TICKET_HOURS } from "@/lib/constants";

/**
 * Support ticket vocabulary and rules. Client safe: the Support Tickets screens
 * read the labels from here and the service reads the same transitions.
 */

export const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_SENDERS = ["CUSTOMER", "STAFF"] as const;
export type TicketSender = (typeof TICKET_SENDERS)[number];

export const TICKET_EVENT_TYPES = ["CREATED", "STATUS", "PRIORITY", "ASSIGNMENT"] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const TICKET_SORTS = ["updated_desc", "updated_asc", "created_desc", "created_asc"] as const;
export type TicketSort = (typeof TICKET_SORTS)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_FOR_CUSTOMER: "Waiting for customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TICKET_SENDER_LABELS: Record<TicketSender, string> = {
  CUSTOMER: "Customer",
  STAFF: "Staff",
};

export const TICKET_SORT_LABELS: Record<TicketSort, string> = {
  updated_desc: "Last updated, newest",
  updated_asc: "Last updated, oldest",
  created_desc: "Created, newest",
  created_asc: "Created, oldest",
};

/** The seven categories a fresh install starts with. Admins manage them afterwards. */
export const DEFAULT_TICKET_CATEGORIES = [
  "Order Enquiry",
  "Payment Issues",
  "Delivery Issues",
  "Product Enquiry",
  "Returns and Refunds",
  "Warranty and Claims",
  "General Support",
] as const;

/** Assignee filter and assign values that stand for the signed in user and for nobody. */
export const TICKET_ASSIGNEE_ME = "me";
export const TICKET_ASSIGNEE_NONE = "unassigned";

/** Not yet resolved: the tickets still owed work. */
export const UNRESOLVED_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] as const satisfies readonly TicketStatus[];

/** A status change the customer is emailed about. In progress is left out: staff replying already tells them. */
export const CUSTOMER_NOTIFIED_STATUSES = ["WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"] as const satisfies readonly TicketStatus[];

const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"],
  WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  RESOLVED: ["OPEN", "CLOSED"],
  CLOSED: [],
};

export function nextTicketStatuses(status: TicketStatus): TicketStatus[] {
  return [...TRANSITIONS[status]];
}

/** Moving a resolved ticket back to Open is a reopen. */
export function isReopen(from: TicketStatus, to: TicketStatus): boolean {
  return from === "RESOLVED" && to === "OPEN";
}

/**
 * The status a new message moves a ticket to, or null to leave it. A staff
 * reply starts work on an Open ticket; a customer answering a question
 * resumes it, and a customer writing after a resolution reopens it.
 */
export function statusAfterMessage(status: TicketStatus, sender: TicketSender): TicketStatus | null {
  if (sender === "STAFF") return status === "OPEN" ? "IN_PROGRESS" : null;
  if (status === "WAITING_FOR_CUSTOMER") return "IN_PROGRESS";
  if (status === "RESOLVED") return "OPEN";
  return null;
}

export function canReceiveMessages(status: TicketStatus): boolean {
  return status !== "CLOSED";
}

/** The customer spoke last and staff have not answered since. */
export function needsStaffReply(ticket: {
  status: TicketStatus;
  lastCustomerMessageAt: Date | string | null;
  lastStaffReplyAt: Date | string | null;
}): boolean {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return false;
  if (!ticket.lastCustomerMessageAt) return false;
  if (!ticket.lastStaffReplyAt) return true;
  return new Date(ticket.lastCustomerMessageAt).getTime() > new Date(ticket.lastStaffReplyAt).getTime();
}

export function isNewTicket(createdAt: Date | string, now: Date): boolean {
  return now.getTime() - new Date(createdAt).getTime() < SUPPORT_NEW_TICKET_HOURS * MS_PER_HOUR;
}

export type TicketTone = "live" | "warn" | "muted" | "danger" | "accent";

export function ticketStatusTone(status: TicketStatus): TicketTone {
  if (status === "OPEN") return "accent";
  if (status === "IN_PROGRESS" || status === "WAITING_FOR_CUSTOMER") return "warn";
  if (status === "RESOLVED") return "live";
  return "muted";
}

export function ticketPriorityTone(priority: TicketPriority): TicketTone {
  if (priority === "URGENT") return "danger";
  if (priority === "HIGH") return "warn";
  return "muted";
}

export function ticketHref(number: string): string {
  return `${ADMIN_SUPPORT_PATH}/${number}`;
}

export const TICKET_EVENT_VERBS: Record<TicketEventType, string> = {
  CREATED: "Created",
  STATUS: "Status",
  PRIORITY: "Priority",
  ASSIGNMENT: "Assigned",
};
