import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createRelease, listReleases } from "@/services/release.service";
import { releaseListQuerySchema, releaseSchema } from "@/validators/release.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.releases);
  if (!auth.ok) return auth.response;

  const query = releaseListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listReleases(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/releases");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.releases, "CREATE");
  if (!auth.ok) return auth.response;

  const input = releaseSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const result = await createRelease(input.data);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.releases,
      recordId: result.id,
      recordLabel: result.title,
      after: result,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/releases");
  }
}
