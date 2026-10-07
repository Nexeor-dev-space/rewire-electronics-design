import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getStoreSettings, updateStoreSettings } from "@/services/store-settings.service";
import { storeSettingsSchema } from "@/validators/return.validator";

const AUDIT_LABEL = "Store settings";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.returns);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getStoreSettings());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/store-settings");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.returns, "EDIT");
  if (!auth.ok) return auth.response;

  const input = storeSettingsSchema.safeParse(await req.json().catch(() => null));
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
    const result = await updateStoreSettings(auth.session.user.id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.returns,
      recordLabel: AUDIT_LABEL,
      before: { returnWindowDays: before.returnWindowDays },
      after: { returnWindowDays: result.returnWindowDays },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/store-settings");
  }
}
