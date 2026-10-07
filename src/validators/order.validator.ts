import { z } from "zod";
import {
  ORDER_NOTE_MAX_LENGTH,
  ORDER_NUMBER_PREFIX,
  REFERENCE_NUMBER_DIGITS,
  SEARCH_QUERY_MAX_LENGTH,
  STAFF_NOTE_MAX_LENGTH,
  TRACKING_NUMBER_MAX_LENGTH,
} from "@/lib/constants";
import {
  FULFILMENT_QUEUE_STATUSES,
  FULFILMENT_TARGET_STATUSES,
  MANUAL_PAYMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from "@/lib/orders";
import { emailValidator, paginationQueryValidator } from "./common/primitives.validator";

const ORDER_NUMBER_PATTERN = new RegExp(`^${ORDER_NUMBER_PREFIX}\\d{${REFERENCE_NUMBER_DIGITS}}$`);
const ORDER_NUMBER_EXAMPLE = `${ORDER_NUMBER_PREFIX}${"0".repeat(REFERENCE_NUMBER_DIGITS)}`;
const MESSAGE_NOTHING_TO_UPDATE = "Nothing to update.";

export const orderNumberValidator = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "Enter the order number.")
  .regex(ORDER_NUMBER_PATTERN, `Enter the order number as it appears on your email, e.g. ${ORDER_NUMBER_EXAMPLE}.`);

const trackingNumberValidator = z
  .string()
  .trim()
  .max(TRACKING_NUMBER_MAX_LENGTH, `Use ${TRACKING_NUMBER_MAX_LENGTH} characters or fewer.`);

export const orderNumberParamsSchema = z.object({ number: orderNumberValidator });

export const accountOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export const trackOrderSchema = z.object({
  number: orderNumberValidator,
  email: emailValidator,
});

export const adminOrderListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
});

export const updateOrderSchema = z
  .object({
    trackingNumber: trackingNumberValidator.optional(),
    staffNote: z
      .string()
      .trim()
      .max(STAFF_NOTE_MAX_LENGTH, `Use ${STAFF_NOTE_MAX_LENGTH} characters or fewer.`)
      .optional(),
  })
  .refine((data) => data.trackingNumber !== undefined || data.staffNote !== undefined, {
    message: MESSAGE_NOTHING_TO_UPDATE,
  });

export const orderStatusChangeSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: "Choose a status." }),
  note: z
    .string()
    .trim()
    .max(ORDER_NOTE_MAX_LENGTH, `Use ${ORDER_NOTE_MAX_LENGTH} characters or fewer.`)
    .default(""),
});

export const orderPaymentSchema = z.object({
  paymentStatus: z.enum(MANUAL_PAYMENT_STATUSES, { error: "Choose a payment status." }),
});

export const fulfilmentQuerySchema = paginationQueryValidator.extend({
  status: z.enum(FULFILMENT_QUEUE_STATUSES).optional(),
});

export const fulfilmentUpdateSchema = z
  .object({
    status: z.enum(FULFILMENT_TARGET_STATUSES, { error: "Choose a status." }).optional(),
    trackingNumber: trackingNumberValidator.optional(),
  })
  .refine((data) => data.status !== undefined || data.trackingNumber !== undefined, {
    message: MESSAGE_NOTHING_TO_UPDATE,
  });
