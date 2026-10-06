import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { discardHomepageDraft } from "@/services/homepage.service";

export async function POST() {
  const auth = await authorizeApi(PERMISSIONS.homepage, "PUBLISH");
  if (!auth.ok) return auth.response;

  try {
    const result = await discardHomepageDraft();
    await recordAudit(auth.session.user, {
      action: "DISCARD",
      module: PERMISSIONS.homepage,
      recordLabel: "Homepage",
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/homepage/discard");
  }
}
