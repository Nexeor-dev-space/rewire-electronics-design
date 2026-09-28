import { z } from "zod";
import { CART_MAX_LINE_QUANTITY, COUPON_CODE_MAX_LENGTH, MAX_PRODUCT_ADD_ONS } from "@/lib/constants";
import { DELIVERY_METHODS } from "@/lib/delivery";
import { EMIRATE_VALUES } from "@/lib/emirates";
import { idValidator } from "./common/primitives.validator";

const addOnIdsValidator = z
  .array(idValidator)
  .max(MAX_PRODUCT_ADD_ONS, `Choose up to ${MAX_PRODUCT_ADD_ONS} add-ons.`)
  .transform((ids) => [...new Set(ids)]);

const quantityValidator = z
  .number()
  .int()
  .min(1, "Choose at least 1.")
  .max(CART_MAX_LINE_QUANTITY, `You can add up to ${CART_MAX_LINE_QUANTITY} of this item.`);

export const addCartItemSchema = z.object({
  variantId: idValidator,
  quantity: quantityValidator.default(1),
  addOnIds: addOnIdsValidator.default([]),
});

export const updateCartItemSchema = z
  .object({
    quantity: quantityValidator.optional(),
    addOnIds: addOnIdsValidator.optional(),
  })
  .refine((data) => data.quantity !== undefined || data.addOnIds !== undefined, {
    message: "Nothing to update.",
  });

export const cartItemParamsSchema = z.object({ id: idValidator });

export const applyCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Enter a code.")
    .max(COUPON_CODE_MAX_LENGTH, "That code isn't valid."),
});

export const cartQuoteQuerySchema = z.object({
  emirate: z.enum(EMIRATE_VALUES),
  method: z.enum(DELIVERY_METHODS).default("STANDARD"),
});
