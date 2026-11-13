import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getInvoiceSettings, updateInvoiceSettings } from "@/services/store-settings.service";
import type { InvoiceSettingsView } from "@/types/invoice";
import { invoiceSettingsSchema } from "@/validators/invoice.validator";

const AUDIT_LABEL = "Contact & invoice details";

const auditView = ({
  sellerName,
  sellerTrn,
  sellerAddress,
  sellerEmail,
  phone,
  whatsapp,
  supportHours,
  terms,
}: InvoiceSettingsView) => ({
  sellerName,
  sellerTrn,
  sellerAddress,
  sellerEmail,
  phone,
  whatsapp,
  supportHours,
  terms,
});

/** The seller block printed on invoices. Same permission as the VAT rate. */
export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.vat);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getInvoiceSettings());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/invoice-settings");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.vat, "EDIT");
  if (!auth.ok) return auth.response;

  const input = invoiceSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const before = await getInvoiceSettings();
    const result = await updateInvoiceSettings(auth.session.user.id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.vat,
      recordLabel: AUDIT_LABEL,
      before: auditView(before),
      after: auditView(result),
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/invoice-settings");
  }
}
