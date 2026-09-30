import { apiError } from "@/lib/api/api-response";
import { canManageIntegrations, PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";

export async function authorizeIntegrations() {
  const auth = await authorizeApi(PERMISSIONS.integrations);
  if (!auth.ok) return auth;
  if (!canManageIntegrations(auth.session.user.role)) {
    return {
      ok: false as const,
      response: apiError("FORBIDDEN", "Only Admins can manage integrations.", 403),
    };
  }
  return auth;
}
