import { z } from "zod";
import { MAX_DELIVERY_DAYS } from "@/lib/constants";
import { EMIRATE_VALUES } from "@/lib/emirates";
import { minorUnitsValidator } from "./common/primitives.validator";

export const deliveryZoneParamsSchema = z.object({ emirate: z.enum(EMIRATE_VALUES) });

const days = z
  .number()
  .int("Enter a whole number of days.")
  .min(0, "Days can't be negative.")
  .max(MAX_DELIVERY_DAYS, `Use ${MAX_DELIVERY_DAYS} days or fewer.`);

const fee = minorUnitsValidator.min(0, "The fee can't be negative.");

const RANGE_MESSAGE = "The latest day can't be before the earliest.";

export const deliveryZoneSchema = z
  .object({
    standardFee: fee,
    expressFee: fee,
    standardMinDays: days,
    standardMaxDays: days,
    expressMinDays: days,
    expressMaxDays: days,
  })
  .superRefine((data, ctx) => {
    if (data.standardMinDays > data.standardMaxDays) {
      ctx.addIssue({ code: "custom", path: ["standardMaxDays"], message: RANGE_MESSAGE });
    }
    if (data.expressMinDays > data.expressMaxDays) {
      ctx.addIssue({ code: "custom", path: ["expressMaxDays"], message: RANGE_MESSAGE });
    }
  });
