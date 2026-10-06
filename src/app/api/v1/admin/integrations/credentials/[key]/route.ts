import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  deleteIntegrationCredential,
  setIntegrationCredential,
} from "@/services/integration.service";
import {
  integrationCredentialSchema,
  integrationKeyParamSchema,
} from "@/validators/integration.validator";
import { authorizeIntegrations } from "../../authorize";
import { recordAudit } from "@/services/audit.service";

type Params = { params: Promise<{ key: string }> };

async function parseKey(params: Params["params"]) {
  return integrationKeyParamSchema.safeParse((await params).key);
}

const unknownKey = () => apiError("NOT_FOUND", "Unknown integration setting.", 404);

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeIntegrations();
  if (!auth.ok) return auth.response;

  const key = await parseKey(params);
  if (!key.success) return unknownKey();

  const input = integrationCredentialSchema(key.data).safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const result = await setIntegrationCredential(key.data, input.data.value, auth.session.user.id);
    // Never the value: only that it was set.
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.integrations,
      recordId: key.data,
      recordLabel: key.data,
      after: { [key.data]: "Set" },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, `PUT /admin/integrations/credentials/${key.data}`);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeIntegrations();
  if (!auth.ok) return auth.response;

  const key = await parseKey(params);
  if (!key.success) return unknownKey();

  try {
    const result = await deleteIntegrationCredential(key.data);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: PERMISSIONS.integrations,
      recordId: key.data,
      recordLabel: key.data,
      before: { [key.data]: "Set" },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, `DELETE /admin/integrations/credentials/${key.data}`);
  }
}
