import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { changeReleaseState, getRelease } from "@/services/release.service";
import type { AdminReleaseDetail } from "@/types/release";
import { releaseStateSchema } from "@/validators/release.validator";

type Params = { params: Promise<{ id: string }> };

function stateSnapshot(release: AdminReleaseDetail) {
  return {
    status: release.status,
    publishedAt: release.publishedAt,
    startsAt: release.startsAt,
    endsAt: release.endsAt,
  };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.releases, "EDIT");
  if (!auth.ok) return auth.response;

  const input = releaseStateSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Choose an action.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    const before = await getRelease(id);
    const result = await changeReleaseState(id, input.data.action);
    await recordAudit(auth.session.user, {
      action: input.data.action === "PUBLISH" ? "PUBLISH" : "UPDATE",
      module: PERMISSIONS.releases,
      recordId: id,
      recordLabel: result.title,
      before: stateSnapshot(before),
      after: stateSnapshot(result),
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/releases/[id]/state");
  }
}
