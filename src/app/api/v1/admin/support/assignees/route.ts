import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listAssignees } from "@/services/support.service";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.support);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await listAssignees());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/support/assignees");
  }
}
