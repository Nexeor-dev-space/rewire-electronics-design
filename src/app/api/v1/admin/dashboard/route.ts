import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { authorizeApi, forbidden } from "@/lib/auth/session";
import { getDashboardMetrics } from "@/services/dashboard.service";

export async function GET() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;
  if (!canAccessAdmin(auth.session.user.role)) return forbidden();

  try {
    return apiSuccess(await getDashboardMetrics(auth.session.user.permissions));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/dashboard");
  }
}
