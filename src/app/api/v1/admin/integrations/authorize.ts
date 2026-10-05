import { apiError } from "@/lib/api/api-response";
import { canManageIntegrations } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";

/** Admin only, so the role check stands in for the grid and names why. */
export async function authorizeIntegrations() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth;
  if (!canManageIntegrations(auth.session.user.role)) {
    return {
      ok: false as const,
      response: apiError("FORBIDDEN", "Only Admins can manage integrations.", 403),
    };
  }
  return auth;
}
