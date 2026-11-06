import { z } from "zod";
import { INVOICE_SELLER_FIELD_MAX_LENGTH, INVOICE_TERMS_MAX_LENGTH } from "@/lib/constants";

const UAE_TRN = /^\d{15}$/;

const sellerField = (label: string) =>
  z.string().trim().max(INVOICE_SELLER_FIELD_MAX_LENGTH, `Keep the ${label} under ${INVOICE_SELLER_FIELD_MAX_LENGTH} characters.`);

/** `PUT /api/v1/admin/invoice-settings`: the seller block printed on every invoice. */
export const invoiceSettingsSchema = z.object({
  sellerName: sellerField("legal name").min(1, "Enter the legal name."),
  sellerTrn: z
    .string()
    .trim()
    .refine((value) => value === "" || UAE_TRN.test(value), "A TRN is 15 digits."),
  sellerAddress: sellerField("address"),
  sellerEmail: z.union([z.literal(""), z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."))]),
  /** One point per line. */
  terms: z.string().trim().max(INVOICE_TERMS_MAX_LENGTH, `Keep the terms under ${INVOICE_TERMS_MAX_LENGTH} characters.`),
});
