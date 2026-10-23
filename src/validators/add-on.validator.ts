import { z } from "zod";
import { MAX_WARRANTY_MONTHS } from "@/lib/constants";
import { idValidator, minorUnitsValidator, paginationQueryValidator } from "./common/primitives.validator";

export const ADD_ON_KINDS = ["PROTECTION", "ACCESSORY", "SERVICE"] as const;
export type AddOnKind = (typeof ADD_ON_KINDS)[number];

export const MAX_ADD_ON_CATEGORIES = 50;

export const addOnListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
  kind: z.enum(ADD_ON_KINDS).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const addOnSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(80, "Use 80 characters or fewer."),
    note: z.string().trim().max(160, "Use 160 characters or fewer.").default(""),
    kind: z.enum(ADD_ON_KINDS, { error: "Choose a kind." }),
    price: minorUnitsValidator.min(0, "Price can't be negative."),
    extraWarrantyMonths: z
      .number({ error: "Enter a number of months." })
      .int("Use a whole number.")
      .min(0, "Use 0 or more.")
      .max(MAX_WARRANTY_MONTHS, `Use ${MAX_WARRANTY_MONTHS} months or fewer.`)
      .default(0),
    popular: z.boolean().default(false),
    active: z.boolean().default(true),
    appliesToAll: z.boolean().default(false),
    categoryIds: z.array(idValidator).max(MAX_ADD_ON_CATEGORIES).default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.appliesToAll && data.categoryIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["categoryIds"],
        message: "Choose at least one category, or offer it on every product.",
      });
    }
    if (data.extraWarrantyMonths > 0 && data.kind !== "PROTECTION") {
      ctx.addIssue({
        code: "custom",
        path: ["extraWarrantyMonths"],
        message: "Only protection add-ons extend the warranty.",
      });
    }
  });
