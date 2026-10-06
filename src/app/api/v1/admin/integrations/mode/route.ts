import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { recordAudit } from "@/services/audit.service";
import { getIntegrationStatus, setIntegrationMode } from "@/services/integration.service";
import { integrationModeSchema } from "@/validators/integration.validator";
import { authorizeIntegrations } from "../authorize";

export async function PUT(req: NextRequest) {
  const auth = await authorizeIntegrations();
  if (!auth.ok) return auth.response;

  const input = integrationModeSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please choose DEV or LIVE.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const before = await getIntegrationStatus();
    const result = await setIntegrationMode(input.data.mode, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.integrations,
      recordLabel: "Integration mode",
      before: { mode: before.mode },
      after: { mode: result.mode },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/integrations/mode");
  }
}
