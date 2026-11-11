import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { getNavigationOptions } from "@/services/navigation.service";

/** The categories and upcoming drops the header can list. Bounded by NAV_DROPS_LIMIT and the category set. */
export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.navigation);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getNavigationOptions());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/navigation/options");
  }
}
