import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS, accountModule, hasPermission } from "@/lib/auth/permissions";
import { authorizeApi, forbidden } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createUser, listUsers } from "@/services/user.service";
import { userListQuerySchema, userSchema } from "@/validators/user.validator";

/** `group=customers` needs Customers; `group=staff` needs Staff accounts (Admin only). */
export async function GET(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const query = userListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  const moduleKey = query.data.group === "staff" ? PERMISSIONS.staffAccounts : PERMISSIONS.customers;
  if (!hasPermission(auth.session.user.permissions, moduleKey)) return forbidden();

  try {
    return apiSuccess(await listUsers(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/users");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const input = userSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  const moduleKey = accountModule(input.data.role);
  if (!hasPermission(auth.session.user.permissions, moduleKey, "CREATE")) return forbidden();

  try {
    const result = await createUser(auth.session.user, input.data);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: moduleKey,
      recordId: result.id,
      recordLabel: result.fullName,
      after: result,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/users");
  }
}
