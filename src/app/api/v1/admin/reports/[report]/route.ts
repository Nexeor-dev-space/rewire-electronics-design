import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { getReport } from "@/services/report.service";
import { reportParamsSchema, reportQuerySchema } from "@/validators/report.validator";

type Params = { params: Promise<{ report: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.reports);
  if (!auth.ok) return auth.response;

  const parsed = reportParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", "We couldn't find that report.", 404);

  const query = reportQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", query.error.issues[0].message, 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await getReport(parsed.data.report, query.data));
  } catch (error) {
    return apiErrorFrom(error, `GET /admin/reports/${parsed.data.report}`);
  }
}
