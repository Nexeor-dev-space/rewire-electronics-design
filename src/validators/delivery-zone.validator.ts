import { z } from "zod";
import { DELIVERY_AREA_MAX_LENGTH, MAX_DELIVERY_DAYS } from "@/lib/constants";
import { EMIRATE_VALUES } from "@/lib/emirates";
import { idValidator, minorUnitsValidator, paginationQueryValidator } from "./common/primitives.validator";

export const deliveryZoneParamsSchema = z.object({ emirate: z.enum(EMIRATE_VALUES) });

const days = z
  .number()
  .int("Enter a whole number of days.")
  .min(0, "Days can't be negative.")
  .max(MAX_DELIVERY_DAYS, `Use ${MAX_DELIVERY_DAYS} days or fewer.`);

const fee = minorUnitsValidator.min(0, "The fee can't be negative.");

const RANGE_MESSAGE = "The latest day can't be before the earliest.";
const PAIR_MESSAGE = "Set both days, or leave both empty to use the emirate's.";

const METHOD_DAYS = [
  ["standardMinDays", "standardMaxDays"],
  ["expressMinDays", "expressMaxDays"],
] as const;

type DayFields = Record<(typeof METHOD_DAYS)[number][number], number | null>;

/** Each method's days: both set or both empty, and the latest not before the earliest. */
function checkDays(data: DayFields, ctx: z.RefinementCtx) {
  for (const [minField, maxField] of METHOD_DAYS) {
    const min = data[minField];
    const max = data[maxField];
    if ((min === null) !== (max === null)) {
      ctx.addIssue({ code: "custom", path: [min === null ? minField : maxField], message: PAIR_MESSAGE });
    } else if (min !== null && max !== null && min > max) {
      ctx.addIssue({ code: "custom", path: [maxField], message: RANGE_MESSAGE });
    }
  }
}

export const deliveryZoneSchema = z
  .object({
    enabled: z.boolean(),
    standardFee: fee,
    expressFee: fee,
    standardMinDays: days,
    standardMaxDays: days,
    expressMinDays: days,
    expressMaxDays: days,
  })
  .superRefine(checkDays);

/* ---------- areas ---------- */

export const deliveryAreaParamsSchema = z.object({ id: idValidator });

export const deliveryAreaListQuerySchema = paginationQueryValidator.extend({
  emirate: z.enum(EMIRATE_VALUES).optional(),
  search: z.string().trim().max(DELIVERY_AREA_MAX_LENGTH).optional(),
});

/** The storefront's area dropdown for one emirate. */
export const deliveryAreaOptionsQuerySchema = z.object({
  emirate: z.enum(EMIRATE_VALUES, { error: "Choose an emirate." }),
});

export const deliveryAreaSchema = z
  .object({
    emirate: z.enum(EMIRATE_VALUES, { error: "Choose an emirate." }),
    area: z
      .string()
      .trim()
      .min(1, "Enter the area.")
      .max(DELIVERY_AREA_MAX_LENGTH, `Use ${DELIVERY_AREA_MAX_LENGTH} characters or fewer.`),
    enabled: z.boolean(),
    standardFee: fee.nullable(),
    expressFee: fee.nullable(),
    standardMinDays: days.nullable(),
    standardMaxDays: days.nullable(),
    expressMinDays: days.nullable(),
    expressMaxDays: days.nullable(),
  })
  .superRefine(checkDays);
