import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listAuditLogs } from "@/services/audit.service";
import { auditListQuerySchema } from "@/validators/audit.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.changeLog);
  if (!auth.ok) return auth.response;

  const query = auditListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid filters.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listAuditLogs(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/audit-logs");
  }
}
