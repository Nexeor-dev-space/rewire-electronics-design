import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { deleteStaffRole, getStaffRole, updateStaffRole } from "@/services/staff-role.service";
import { staffRoleSchema } from "@/validators/role.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.roles);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getStaffRole(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/roles/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.roles, "EDIT");
  if (!auth.ok) return auth.response;

  const input = staffRoleSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  const { id } = await params;
  try {
    const before = await getStaffRole(id);
    const result = await updateStaffRole(id, input.data, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.roles,
      recordId: id,
      recordLabel: result.name,
      before,
      after: result,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/roles/[id]");
  }
}

/** 409 while any account holds the role. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.roles, "EDIT");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await getStaffRole(id);
    const result = await deleteStaffRole(id);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: PERMISSIONS.roles,
      recordId: id,
      recordLabel: before.name,
      before,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/roles/[id]");
  }
}
