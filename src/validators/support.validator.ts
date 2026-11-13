import { z } from "zod";
import {
  FULL_NAME_MAX_LENGTH,
  REFERENCE_NUMBER_DIGITS,
  SEARCH_QUERY_MAX_LENGTH,
  SUPPORT_CATEGORY_NAME_MAX_LENGTH,
  SUPPORT_MESSAGE_MAX_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
  SUPPORT_TICKET_NUMBER_PREFIX,
} from "@/lib/constants";
import { DEFAULT_TICKET_PRIORITY, TICKET_PRIORITIES, TICKET_SENDERS, TICKET_SORTS, TICKET_STATUSES } from "@/lib/support-tickets";
import { emailValidator, idValidator, paginationQueryValidator } from "./common/primitives.validator";
import { orderNumberValidator } from "./order.validator";

const TICKET_NUMBER_PATTERN = new RegExp(`^${SUPPORT_TICKET_NUMBER_PREFIX}\\d{${REFERENCE_NUMBER_DIGITS}}$`);

export const ticketNumberValidator = z
  .string()
  .trim()
  .toUpperCase()
  .regex(TICKET_NUMBER_PATTERN, "Enter a valid ticket number.");

export const ticketNumberParamsSchema = z.object({ number: ticketNumberValidator });

const messageBodyValidator = z
  .string()
  .trim()
  .min(1, "Write a message.")
  .max(SUPPORT_MESSAGE_MAX_LENGTH, `Use ${SUPPORT_MESSAGE_MAX_LENGTH} characters or fewer.`);

export const ticketListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  categoryId: idValidator.optional(),
  /** A staff id, "me" or "unassigned". */
  assignee: idValidator.optional(),
  sort: z.enum(TICKET_SORTS).default("updated_desc"),
});

export const createTicketSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Enter the customer's name.")
    .max(FULL_NAME_MAX_LENGTH, "That name is too long."),
  customerEmail: emailValidator,
  subject: z
    .string()
    .trim()
    .min(1, "Enter a subject.")
    .max(SUPPORT_SUBJECT_MAX_LENGTH, `Use ${SUPPORT_SUBJECT_MAX_LENGTH} characters or fewer.`),
  categoryId: idValidator,
  priority: z.enum(TICKET_PRIORITIES).default(DEFAULT_TICKET_PRIORITY),
  orderNumber: z
    .string()
    .trim()
    .transform((value) => value || undefined)
    .pipe(orderNumberValidator.optional()),
  message: messageBodyValidator,
});

/** The storefront form: the same fields, but a customer cannot choose the priority. */
export const customerTicketSchema = createTicketSchema.omit({ priority: true });

export const ticketMessageSchema = z.object({
  body: messageBodyValidator,
  /** Staff can log a message the customer sent by phone or email. */
  from: z.enum(TICKET_SENDERS).default("STAFF"),
});

export const ticketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES, { error: "Choose a status." }),
});

export const ticketPrioritySchema = z.object({
  priority: z.enum(TICKET_PRIORITIES, { error: "Choose a priority." }),
});

export const ticketAssignSchema = z.object({
  /** A staff id, "me", or null to unassign. */
  assigneeId: idValidator.nullable(),
});

export const ticketCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a category name.")
    .max(SUPPORT_CATEGORY_NAME_MAX_LENGTH, `Use ${SUPPORT_CATEGORY_NAME_MAX_LENGTH} characters or fewer.`),
  isActive: z.boolean().default(true),
});

export const supportSettingsSchema = z.object({ inboxEmail: emailValidator });

export const ticketCategoryParamsSchema = z.object({ id: idValidator });
