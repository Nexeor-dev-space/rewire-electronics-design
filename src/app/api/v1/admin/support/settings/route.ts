import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getSupportInboxEmail, updateSupportInboxEmail } from "@/services/store-settings.service";
import { supportSettingsSchema } from "@/validators/support.validator";

const AUDIT_LABEL = "Support inbox email";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.support, "DELETE");
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess({ inboxEmail: await getSupportInboxEmail() });
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/support/settings");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.support, "DELETE");
  if (!auth.ok) return auth.response;

  const input = supportSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    const before = await getSupportInboxEmail();
    const inboxEmail = await updateSupportInboxEmail(auth.session.user.id, input.data.inboxEmail);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.support,
      recordLabel: AUDIT_LABEL,
      before: { inboxEmail: before },
      after: { inboxEmail },
    });
    return apiSuccess({ inboxEmail });
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/support/settings");
  }
}
