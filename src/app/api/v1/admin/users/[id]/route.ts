import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { accountModule, hasPermission } from "@/lib/auth/permissions";
import { authorizeApi, forbidden } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { deleteUser, getUser, updateUser } from "@/services/user.service";
import { userSchema } from "@/validators/user.validator";

/**
 * Customer accounts are checked against Customers, everyone else against
 * Staff accounts (Admin only); see `accountModule`.
 */

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const user = await getUser(id);
    if (!hasPermission(auth.session.user.permissions, accountModule(user.role))) return forbidden();
    return apiSuccess(user);
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/users/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const input = userSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    const before = await getUser(id);
    // Both the current and the new role count, so a customer can't be made staff here.
    const moduleKey = accountModule(before.role, input.data.role);
    if (!hasPermission(auth.session.user.permissions, moduleKey, "EDIT")) return forbidden();

    const result = await updateUser(auth.session.user, id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: moduleKey,
      recordId: id,
      recordLabel: result.fullName,
      before,
      after: result,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/users/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await getUser(id);
    const moduleKey = accountModule(before.role);
    if (!hasPermission(auth.session.user.permissions, moduleKey, "DELETE")) return forbidden();

    const result = await deleteUser(auth.session.user, id);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: moduleKey,
      recordId: id,
      recordLabel: before.fullName,
      before,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/users/[id]");
  }
}
