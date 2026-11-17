import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { limitByUser } from "@/lib/rate-limit";
import { runIntegrationTest } from "@/services/integration.service";
import { integrationParamsSchema } from "@/validators/integration.validator";

type Params = { params: Promise<{ key: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.integrations, "EDIT");
  if (!auth.ok) return auth.response;

  const target = integrationParamsSchema.safeParse(await params);
  if (!target.success) {
    return apiError("NOT_FOUND", "We couldn't find that integration.", 404);
  }

  const limited = limitByUser(auth.session.user.id, "integrationTest");
  if (limited) return limited;

  try {
    return apiSuccess(await runIntegrationTest(target.data.key, auth.session.user));
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/integrations/[key]/test");
  }
}
