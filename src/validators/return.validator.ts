import { z } from "zod";
import {
  CART_MAX_LINE_QUANTITY,
  CART_MAX_LINES,
  ORDER_NOTE_MAX_LENGTH,
  REFERENCE_NUMBER_DIGITS,
  REFUND_REFERENCE_MAX_LENGTH,
  RETURN_DETAIL_MAX_LENGTH,
  RETURN_DETAIL_MIN_LENGTH,
  RETURN_NUMBER_PREFIX,
  RETURN_WINDOW_MAX_DAYS,
  SEARCH_QUERY_MAX_LENGTH,
} from "@/lib/constants";
import { RETURN_REASON_META, RETURN_REASONS, RETURN_STATE_FILTERS, RETURN_STATUSES } from "@/lib/returns";
import { idValidator, minorUnitsValidator, paginationQueryValidator } from "./common/primitives.validator";
import { orderNumberValidator } from "./order.validator";

const RETURN_NUMBER_PATTERN = new RegExp(`^${RETURN_NUMBER_PREFIX}\\d{${REFERENCE_NUMBER_DIGITS}}$`);
const STATUS_CHANGE_TARGETS = RETURN_STATUSES.filter(
  (status): status is Exclude<(typeof RETURN_STATUSES)[number], "REFUNDED"> => status !== "REFUNDED",
);

const pageValidator = z.coerce.number().int().min(1).default(1);

export const returnNumberValidator = z
  .string()
  .trim()
  .toUpperCase()
  .regex(RETURN_NUMBER_PATTERN, "Enter a valid return number.");

export const returnNumberParamsSchema = z.object({ number: returnNumberValidator });

export const createReturnSchema = z
  .object({
    orderNumber: orderNumberValidator,
    items: z
      .array(
        z.object({
          orderItemId: idValidator,
          quantity: z
            .number()
            .int()
            .min(1, "Return at least 1.")
            .max(CART_MAX_LINE_QUANTITY, `Return ${CART_MAX_LINE_QUANTITY} or fewer.`),
        }),
      )
      .min(1, "Choose an item to return.")
      .max(CART_MAX_LINES, `Choose ${CART_MAX_LINES} items or fewer.`),
    reason: z.enum(RETURN_REASONS, { error: "Choose a reason." }),
    detail: z
      .string()
      .trim()
      .max(RETURN_DETAIL_MAX_LENGTH, `Use ${RETURN_DETAIL_MAX_LENGTH} characters or fewer.`)
      .default(""),
  })
  .superRefine((data, ctx) => {
    if (RETURN_REASON_META[data.reason].requiresDetail && data.detail.length < RETURN_DETAIL_MIN_LENGTH) {
      ctx.addIssue({ code: "custom", path: ["detail"], message: "Tell us a little more about the problem." });
    }
    const ids = data.items.map((item) => item.orderItemId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "Each item can be listed once." });
    }
  });

export const accountReturnsQuerySchema = z.object({
  page: pageValidator,
  state: z.enum(RETURN_STATE_FILTERS).optional(),
});

export const returnEligibleQuerySchema = z.object({
  page: pageValidator,
});

export const adminReturnListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  status: z.enum(RETURN_STATUSES).optional(),
});

export const returnStatusChangeSchema = z.object({
  status: z.enum(STATUS_CHANGE_TARGETS, { error: "Choose a status." }),
  note: z
    .string()
    .trim()
    .max(ORDER_NOTE_MAX_LENGTH, `Use ${ORDER_NOTE_MAX_LENGTH} characters or fewer.`)
    .default(""),
});

export const recordRefundSchema = z.object({
  amount: minorUnitsValidator.min(1, "Enter an amount above 0."),
  reference: z
    .string()
    .trim()
    .min(1, "Enter the refund reference.")
    .max(REFUND_REFERENCE_MAX_LENGTH, `Use ${REFUND_REFERENCE_MAX_LENGTH} characters or fewer.`),
  note: z
    .string()
    .trim()
    .max(ORDER_NOTE_MAX_LENGTH, `Use ${ORDER_NOTE_MAX_LENGTH} characters or fewer.`)
    .default(""),
});

export const storeSettingsSchema = z.object({
  returnWindowDays: z
    .number()
    .int("Use whole days.")
    .min(0, "Use 0 days or more.")
    .max(RETURN_WINDOW_MAX_DAYS, `Use ${RETURN_WINDOW_MAX_DAYS} days or fewer.`),
});
