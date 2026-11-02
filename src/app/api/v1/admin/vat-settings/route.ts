import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getStoreSettings, updateVatSettings } from "@/services/store-settings.service";
import { vatSettingsSchema } from "@/validators/vat.validator";

const AUDIT_LABEL = "VAT rate";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.vat);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getStoreSettings());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/vat-settings");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.vat, "EDIT");
  if (!auth.ok) return auth.response;

  const input = vatSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const before = await getStoreSettings();
    const result = await updateVatSettings(auth.session.user.id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.vat,
      recordLabel: AUDIT_LABEL,
      before: { vatRatePercent: before.vatRatePercent },
      after: { vatRatePercent: result.vatRatePercent },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/vat-settings");
  }
}
