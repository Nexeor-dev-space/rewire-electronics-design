import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { setAllocations } from "@/services/release-allocation.service";
import { getRelease } from "@/services/release.service";
import type { AdminReleaseDetail } from "@/types/release";
import { releaseAllocationsSchema } from "@/validators/release.validator";

type Params = { params: Promise<{ id: string }> };

function allocationSnapshot(release: AdminReleaseDetail) {
  return { allocations: Object.fromEntries(release.allocations.map((row) => [row.sku, row.allocated])) };
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.releases, "EDIT");
  if (!auth.ok) return auth.response;

  const input = releaseAllocationsSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the allocations.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    const before = await getRelease(id);
    await setAllocations(id, input.data.allocations);
    const result = await getRelease(id);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.releases,
      recordId: id,
      recordLabel: result.title,
      before: allocationSnapshot(before),
      after: allocationSnapshot(result),
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/releases/[id]/allocations");
  }
}
