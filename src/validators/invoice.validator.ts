import { z } from "zod";
import { CONTACT_HOURS_MAX_LENGTH, INVOICE_SELLER_FIELD_MAX_LENGTH, INVOICE_TERMS_MAX_LENGTH } from "@/lib/constants";
import { parsePhone } from "@/lib/phone";

const UAE_TRN = /^\d{15}$/;

/** A blank value stays blank; anything else must pass the shared phone rules and is saved in stored form. */
const optionalPhone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return "";
    const parsed = parsePhone(value);
    if (parsed.problem !== null) {
      ctx.addIssue({ code: "custom", message: parsed.problem });
      return z.NEVER;
    }
    return parsed.e164;
  });

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
  phone: optionalPhone,
  whatsapp: optionalPhone,
  /** Free text in Gulf time. */
  supportHours: z
    .string()
    .trim()
    .max(CONTACT_HOURS_MAX_LENGTH, `Keep the support hours under ${CONTACT_HOURS_MAX_LENGTH} characters.`),
  /** One point per line. */
  terms: z.string().trim().max(INVOICE_TERMS_MAX_LENGTH, `Keep the terms under ${INVOICE_TERMS_MAX_LENGTH} characters.`),
});
