import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { claimAuditView, createClaim } from "@/services/warranty.service";
import { createClaimSchema, warrantyIdParamsSchema } from "@/validators/warranty.validator";

type Params = { params: Promise<{ id: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that warranty.";

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.warranty, "EDIT");
  if (!auth.ok) return auth.response;

  const parsed = warrantyIdParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  const input = createClaimSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const result = await createClaim(parsed.data.id, input.data, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.warranty,
      recordId: result.number,
      recordLabel: result.number,
      after: { ...claimAuditView(result), issue: result.issue },
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/warranties/[id]/claims");
  }
}
