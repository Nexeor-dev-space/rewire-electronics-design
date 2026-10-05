import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { discardHomepageDraft } from "@/services/homepage.service";

export async function POST() {
  const auth = await authorizeApi(PERMISSIONS.homepage, "PUBLISH");
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await discardHomepageDraft());
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/homepage/discard");
  }
}
