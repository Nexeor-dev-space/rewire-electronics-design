import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { fulfilmentAuditView, getAdminOrderRow, updateFulfilment } from "@/services/order.service";
import { fulfilmentUpdateSchema, orderNumberParamsSchema } from "@/validators/order.validator";

type Params = { params: Promise<{ number: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that order.";

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.fulfilment, "EDIT");
  if (!auth.ok) return auth.response;

  const parsed = orderNumberParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  const input = fulfilmentUpdateSchema.safeParse(await req.json().catch(() => null));
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
    const before = await getAdminOrderRow(number);
    const result = await updateFulfilment(auth.session.user.id, number, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.fulfilment,
      recordId: number,
      recordLabel: number,
      before: fulfilmentAuditView(before),
      after: fulfilmentAuditView(result),
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/fulfilment/[number]");
  }
}
