import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getAdminReturn, recordRefund, returnAuditView } from "@/services/return.service";
import { recordRefundSchema, returnNumberParamsSchema } from "@/validators/return.validator";

type Params = { params: Promise<{ number: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that return.";

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.returns, "EDIT");
  if (!auth.ok) return auth.response;

  const parsed = returnNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  const input = recordRefundSchema.safeParse(await req.json().catch(() => null));
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
    const before = await getAdminReturn(number);
    const result = await recordRefund(number, input.data, auth.session.user.id);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.returns,
      recordId: number,
      recordLabel: number,
      before: returnAuditView(before),
      after: returnAuditView(result),
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/returns/[number]/refund");
  }
}
