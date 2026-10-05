import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS, type PermissionGrid } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { getStaffPermissions, saveStaffPermissions } from "@/services/role-permission.service";
import type { StaffPermissions } from "@/types/role";
import { staffPermissionsSchema } from "@/validators/role.validator";

/** The Staff permission grid. Roles is an Admin only module. */
export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.roles);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess<StaffPermissions>({ permissions: await getStaffPermissions() });
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/roles/staff");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.roles, "EDIT");
  if (!auth.ok) return auth.response;

  const input = staffPermissionsSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Those permissions aren't valid.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    const permissions = await saveStaffPermissions(
      input.data.permissions as PermissionGrid,
      auth.session.user.id,
    );
    return apiSuccess<StaffPermissions>({ permissions });
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/roles/staff");
  }
}
