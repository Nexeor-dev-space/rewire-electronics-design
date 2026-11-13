import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listIntegrations } from "@/services/integration.service";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.integrations);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await listIntegrations());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/integrations");
  }
}
