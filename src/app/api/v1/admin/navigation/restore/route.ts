import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { restorePreviousNavigation } from "@/services/navigation.service";

export async function POST() {
  const auth = await authorizeApi(PERMISSIONS.navigation, "PUBLISH");
  if (!auth.ok) return auth.response;

  try {
    const result = await restorePreviousNavigation();
    await recordAudit(auth.session.user, {
      action: "RESTORE",
      module: PERMISSIONS.navigation,
      recordLabel: "Navigation (previous version)",
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/navigation/restore");
  }
}
