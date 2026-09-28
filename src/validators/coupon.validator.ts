import { z } from "zod";
import {
  COUPON_CODE_MAX_LENGTH,
  COUPON_CODE_MIN_LENGTH,
  COUPON_DESCRIPTION_MAX_LENGTH,
  MAX_COUPON_TARGETS,
} from "@/lib/constants";
import { PERCENT_BASE } from "@/lib/pricing/arithmetic";
import {
  idValidator,
  isoDateTimeValidator,
  minorUnitsValidator,
  paginationQueryValidator,
} from "./common/primitives.validator";

export const COUPON_TYPES = ["PERCENT", "FIXED"] as const;

export const couponCodeValidator = z
  .string()
  .trim()
  .toUpperCase()
  .min(COUPON_CODE_MIN_LENGTH, `Use at least ${COUPON_CODE_MIN_LENGTH} characters.`)
  .max(COUPON_CODE_MAX_LENGTH, `Use ${COUPON_CODE_MAX_LENGTH} characters or fewer.`)
  .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, hyphens and underscores.");

export const couponListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(COUPON_CODE_MAX_LENGTH).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const couponSchema = z
  .object({
    code: couponCodeValidator,
    description: z
      .string()
      .trim()
      .max(COUPON_DESCRIPTION_MAX_LENGTH, `Use ${COUPON_DESCRIPTION_MAX_LENGTH} characters or fewer.`)
      .default(""),
    type: z.enum(COUPON_TYPES, { error: "Choose a discount type." }),
    value: z.number().int("Enter a whole number.").min(1, "Enter a value above zero."),
    minOrderAmount: minorUnitsValidator.min(0, "The minimum can't be negative.").default(0),
    startsAt: isoDateTimeValidator.nullable().default(null),
    endsAt: isoDateTimeValidator.nullable().default(null),
    active: z.boolean().default(true),
    usageLimit: z.number().int().min(1, "Allow at least one use, or leave it empty.").nullable().default(null),
    perCustomerLimit: z
      .number()
      .int()
      .min(1, "Allow at least one use, or leave it empty.")
      .nullable()
      .default(null),
    appliesToAll: z.boolean().default(true),
    productIds: z.array(idValidator).max(MAX_COUPON_TARGETS).default([]),
    categoryIds: z.array(idValidator).max(MAX_COUPON_TARGETS).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENT" && data.value > PERCENT_BASE) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: `Use a percentage from 1 to ${PERCENT_BASE}.`,
      });
    }
    if (data.startsAt && data.endsAt && Date.parse(data.endsAt) <= Date.parse(data.startsAt)) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End after the start date." });
    }
    if (!data.appliesToAll && data.productIds.length === 0 && data.categoryIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["productIds"],
        message: "Choose at least one product or category, or apply it to every product.",
      });
    }
  });
