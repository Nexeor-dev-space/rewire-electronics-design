import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { changeClaimStatus, claimAuditView, getAdminClaim } from "@/services/warranty.service";
import { claimNumberParamsSchema, claimStatusChangeSchema } from "@/validators/warranty.validator";

type Params = { params: Promise<{ number: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that claim.";

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.warranty, "EDIT");
  if (!auth.ok) return auth.response;

  const parsed = claimNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  const input = claimStatusChangeSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  const { number } = parsed.data;
  try {
    const before = await getAdminClaim(number);
    const result = await changeClaimStatus(number, input.data, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.warranty,
      recordId: number,
      recordLabel: number,
      before: claimAuditView(before),
      after: claimAuditView(result),
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/warranty-claims/[number]/status");
  }
}
