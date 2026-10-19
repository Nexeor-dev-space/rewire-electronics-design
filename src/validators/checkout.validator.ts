import { z } from "zod";
import { DELIVERY_METHODS } from "@/lib/delivery";
import { EMIRATE_VALUES } from "@/lib/emirates";
import { PAYMENT_METHODS } from "@/lib/orders";
import { emailValidator, minorUnitsValidator, uaePhoneValidator } from "./common/primitives.validator";

/**
 * The city is required only when no area is picked: a picked area becomes the
 * order's city. The checkout form and `placeOrder` both enforce it, because
 * which one applies depends on the emirate's configured areas.
 */
export const CITY_REQUIRED_MESSAGE = "Enter the city.";

export const checkoutInformationSchema = z.object({
  email: emailValidator,
  phone: uaePhoneValidator,
  emailOptIn: z.boolean().optional(),
  firstName: z.string().trim().min(1, "Enter the first name.").max(100),
  lastName: z.string().trim().min(1, "Enter the last name.").max(100),
  address1: z.string().trim().min(1, "Enter the address.").max(200),
  address2: z.string().trim().max(200).optional(),
  city: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || undefined),
  areaId: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((value) => value || undefined),
  emirate: z.enum(EMIRATE_VALUES, { error: "Choose an emirate." }),
  postalCode: z.string().trim().max(20).optional(),
});

export const placeOrderSchema = checkoutInformationSchema.extend({
  deliveryMethod: z.enum(DELIVERY_METHODS, { error: "Choose a delivery method." }),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Choose a payment method." }),
  expectedTotal: minorUnitsValidator.min(0),
  idempotencyKey: z.uuid(),
});

/** Stripe Checkout session ids look like `cs_test_…` or `cs_live_…`. */
const CHECKOUT_SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]+$/;
const CHECKOUT_SESSION_ID_MAX_LENGTH = 255;

export const confirmPaymentSchema = z.object({
  sessionId: z.string().trim().max(CHECKOUT_SESSION_ID_MAX_LENGTH).regex(CHECKOUT_SESSION_ID_PATTERN),
});

export type CheckoutInformationInput = z.infer<typeof checkoutInformationSchema>;
