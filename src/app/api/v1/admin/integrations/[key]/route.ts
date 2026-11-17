import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { integrationDefinition } from "@/lib/integrations";
import { recordAudit } from "@/services/audit.service";
import { listIntegrations, updateIntegrationValue } from "@/services/integration.service";
import { idIntegrationParamsSchema, integrationValueSchemas } from "@/validators/integration.validator";

type Params = { params: Promise<{ key: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.integrations, "EDIT");
  if (!auth.ok) return auth.response;

  const target = idIntegrationParamsSchema.safeParse(await params);
  if (!target.success) {
    return apiError("NOT_FOUND", "We couldn't find that integration.", 404);
  }

  const { key } = target.data;
  const input = integrationValueSchemas[key].safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const before = (await listIntegrations()).find((integration) => integration.key === key);
    const result = await updateIntegrationValue(key, input.data.value, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.integrations,
      recordId: key,
      recordLabel: integrationDefinition(key).label,
      before: { value: before?.value ?? "" },
      after: { value: result.value },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/integrations/[key]");
  }
}
