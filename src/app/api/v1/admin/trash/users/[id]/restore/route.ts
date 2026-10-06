import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS, accountModule, hasPermission } from "@/lib/auth/permissions";
import { authorizeApi, forbidden } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getUser, restoreUser } from "@/services/user.service";

type Params = { params: Promise<{ id: string }> };

/**
 * Reactivates the account; its old sessions stay signed out. Needs Trash
 * Restore, and for a staff account also Staff accounts (Admin only).
 */
export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.trash, "RESTORE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const moduleKey = accountModule((await getUser(id, { inTrash: true })).role);
    if (!hasPermission(auth.session.user.permissions, moduleKey, "EDIT")) return forbidden();

    const result = await restoreUser(auth.session.user, id);
    await recordAudit(auth.session.user, {
      action: "RESTORE",
      module: moduleKey,
      recordId: id,
      recordLabel: result.fullName,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/trash/users/[id]/restore");
  }
}
