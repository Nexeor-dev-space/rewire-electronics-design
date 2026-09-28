import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { getHomepageDraft } from "@/services/homepage.service";

/** One bounded list (at most MAX_HOMEPAGE_SECTIONS), so not paginated — see docs/HOMEPAGE-CMS.md. */
export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getHomepageDraft());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/homepage");
  }
}
