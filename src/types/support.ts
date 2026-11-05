import type { z } from "zod";
import type { OrderStatus } from "@/lib/orders";
import type {
  TicketEventType,
  TicketPriority,
  TicketSender,
  TicketSort,
  TicketStatus,
} from "@/lib/support-tickets";
import type {
  createTicketSchema,
  ticketAssignSchema,
  ticketCategorySchema,
  ticketMessageSchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from "@/validators/support.validator";

export interface TicketRow {
  number: string;
  subject: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string | null;
  categoryName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  /** Created in the last day. */
  isNew: boolean;
  /** The customer spoke last and staff have not answered since. */
  needsReply: boolean;
}

export interface TicketMessageView {
  id: string;
  sender: TicketSender;
  authorName: string | null;
  body: string;
  at: string;
}

export interface TicketEventView {
  type: TicketEventType;
  from: string;
  to: string;
  actorName: string | null;
  at: string;
}

export interface TicketCustomer {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
}

export interface TicketOrderSummary {
  number: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export interface TicketSibling {
  number: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
}

export interface TicketDetail extends TicketRow {
  categoryId: string;
  /** Null when the email belongs to no customer account. */
  customer: TicketCustomer | null;
  order: TicketOrderSummary | null;
  messages: TicketMessageView[];
  /** All messages on the ticket; more than `messages` holds when the thread is long. */
  messageCount: number;
  events: TicketEventView[];
  nextStatuses: TicketStatus[];
  canReceiveMessages: boolean;
  customerOrders: TicketOrderSummary[];
  customerTickets: TicketSibling[];
}

export interface TicketCategoryView {
  id: string;
  name: string;
  isActive: boolean;
}

export interface TicketAssignee {
  id: string;
  fullName: string;
}

export type TicketFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: string;
  assignee?: string;
  sort?: TicketSort;
};

export type CreateTicketInput = z.input<typeof createTicketSchema>;
export type TicketMessageInput = z.input<typeof ticketMessageSchema>;
export type TicketStatusInput = z.input<typeof ticketStatusSchema>;
export type TicketPriorityInput = z.input<typeof ticketPrioritySchema>;
export type TicketAssignInput = z.input<typeof ticketAssignSchema>;
export type TicketCategoryInput = z.input<typeof ticketCategorySchema>;
