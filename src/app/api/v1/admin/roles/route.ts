import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createStaffRole, listStaffRoles } from "@/services/staff-role.service";
import { staffRoleListQuerySchema, staffRoleSchema } from "@/validators/role.validator";

/** Custom Staff roles. Roles is an Admin only module. */
export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.roles);
  if (!auth.ok) return auth.response;

  const query = staffRoleListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listStaffRoles(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/roles");
  }
}

export async function POST(req: NextRequest) {
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

  try {
    const result = await createStaffRole(input.data, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.roles,
      recordId: result.id,
      recordLabel: result.name,
      after: result,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/roles");
  }
}
