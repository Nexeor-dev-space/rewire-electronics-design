import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getReleaseSettings, updateReleaseSettings } from "@/services/store-settings.service";
import { releaseSettingsSchema } from "@/validators/release.validator";

const AUDIT_LABEL = "Release hold time";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.releases);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getReleaseSettings());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/release-settings");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.releases, "EDIT");
  if (!auth.ok) return auth.response;

  const input = releaseSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const before = await getReleaseSettings();
    const result = await updateReleaseSettings(auth.session.user.id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.releases,
      recordLabel: AUDIT_LABEL,
      before: { releaseHoldMinutes: before.releaseHoldMinutes },
      after: { releaseHoldMinutes: result.releaseHoldMinutes },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/release-settings");
  }
}
