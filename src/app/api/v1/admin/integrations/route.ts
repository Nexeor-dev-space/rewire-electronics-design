import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { getIntegrationStatus } from "@/services/integration.service";
import { authorizeIntegrations } from "./authorize";

export async function GET() {
  const auth = await authorizeIntegrations();
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getIntegrationStatus());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/integrations");
  }
}
