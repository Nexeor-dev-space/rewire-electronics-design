import { z } from "zod";
import { REPORT_MAX_RANGE_DAYS, SEARCH_QUERY_MAX_LENGTH } from "@/lib/constants";
import { ORDER_STATUSES } from "@/lib/orders";
import { INVENTORY_STATUSES, REPORT_KEYS, addDays, daysInRange } from "@/lib/reports";
import { RETURN_STATUSES } from "@/lib/returns";
import { WARRANTY_STATUSES } from "@/lib/warranty";
import { paginationQueryValidator } from "./common/primitives.validator";

const STORE_DAY = /^\d{4}-\d{2}-\d{2}$/;
const MESSAGE_BAD_DAY = "Enter a valid date.";
const MESSAGE_BOTH_DATES = "Choose both a start and an end date.";
const MESSAGE_START_AFTER_END = "The start date must be on or before the end date.";
const MESSAGE_RANGE_TOO_LONG = `Choose a range of ${REPORT_MAX_RANGE_DAYS} days or fewer, or All time.`;

/** `addDays(day, 0)` normalises the date, so a day like 30 February no longer reads the same. */
const storeDayValidator = z
  .string()
  .regex(STORE_DAY, MESSAGE_BAD_DAY)
  .refine((day) => !Number.isNaN(Date.parse(day)) && addDays(day, 0) === day, MESSAGE_BAD_DAY);

export const reportParamsSchema = z.object({ report: z.enum(REPORT_KEYS) });

/** Every report reads the same query; each uses the filters that apply to it. No dates means all time. */
export const reportQuerySchema = paginationQueryValidator
  .extend({
    from: storeDayValidator.optional(),
    to: storeDayValidator.optional(),
    orderStatus: z.enum(ORDER_STATUSES).optional(),
    returnStatus: z.enum(RETURN_STATUSES).optional(),
    warrantyStatus: z.enum(WARRANTY_STATUSES).optional(),
    inventoryStatus: z.enum(INVENTORY_STATUSES).optional(),
    search: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  })
  .superRefine(({ from, to }, context) => {
    if (!from && !to) return;
    if (!from || !to) {
      context.addIssue({ code: "custom", path: [from ? "to" : "from"], message: MESSAGE_BOTH_DATES });
    } else if (from > to) {
      context.addIssue({ code: "custom", path: ["from"], message: MESSAGE_START_AFTER_END });
    } else if (daysInRange(from, to) > REPORT_MAX_RANGE_DAYS) {
      context.addIssue({ code: "custom", path: ["from"], message: MESSAGE_RANGE_TOO_LONG });
    }
  });
