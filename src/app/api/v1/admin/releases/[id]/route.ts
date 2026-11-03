import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { deleteRelease, getRelease, updateRelease } from "@/services/release.service";
import { releaseSchema } from "@/validators/release.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.releases);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getRelease(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/releases/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.releases, "EDIT");
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

  const { id } = await params;
  try {
    const before = await getRelease(id);
    const result = await updateRelease(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.releases,
      recordId: id,
      recordLabel: result.title,
      before,
      after: result,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/releases/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.releases, "DELETE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await getRelease(id);
    const result = await deleteRelease(id);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: PERMISSIONS.releases,
      recordId: id,
      recordLabel: before.title,
      before,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/releases/[id]");
  }
}
