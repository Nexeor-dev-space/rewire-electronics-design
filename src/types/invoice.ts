import type { z } from "zod";
import type { invoiceSettingsSchema } from "@/validators/invoice.validator";

/** `GET /api/v1/admin/invoice-settings`. */
export interface InvoiceSettingsView {
  sellerName: string;
  sellerTrn: string;
  sellerAddress: string;
  sellerEmail: string;
  terms: string;
  updatedAt: string | null;
}

export type InvoiceSettingsInput = z.input<typeof invoiceSettingsSchema>;
