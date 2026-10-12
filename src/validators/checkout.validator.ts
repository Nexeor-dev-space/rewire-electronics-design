import { z } from "zod";
import { DELIVERY_METHODS } from "@/lib/delivery";
import { EMIRATE_VALUES } from "@/lib/emirates";
import { PAYMENT_METHODS } from "@/lib/orders";
import { emailValidator, minorUnitsValidator, uaePhoneValidator } from "./common/primitives.validator";

export const checkoutInformationSchema = z.object({
  email: emailValidator,
  phone: uaePhoneValidator,
  emailOptIn: z.boolean().optional(),
  firstName: z.string().trim().min(1, "Enter the first name.").max(100),
  lastName: z.string().trim().min(1, "Enter the last name.").max(100),
  address1: z.string().trim().min(1, "Enter the address.").max(200),
  address2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1, "Enter the city.").max(100),
  emirate: z.enum(EMIRATE_VALUES, { error: "Choose an emirate." }),
  postalCode: z.string().trim().max(20).optional(),
});

export const placeOrderSchema = checkoutInformationSchema.extend({
  deliveryMethod: z.enum(DELIVERY_METHODS, { error: "Choose a delivery method." }),
  paymentMethod: z.enum(PAYMENT_METHODS, { error: "Choose a payment method." }),
  expectedTotal: minorUnitsValidator.min(0),
  idempotencyKey: z.uuid(),
});

export type CheckoutInformationInput = z.infer<typeof checkoutInformationSchema>;
