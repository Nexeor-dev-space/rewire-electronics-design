import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getAdminWarranty, updateWarranty, warrantyAuditView } from "@/services/warranty.service";
import { updateWarrantySchema, warrantyIdParamsSchema } from "@/validators/warranty.validator";

type Params = { params: Promise<{ id: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that warranty.";

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.warranty);
  if (!auth.ok) return auth.response;

  const parsed = warrantyIdParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  try {
    return apiSuccess(await getAdminWarranty(parsed.data.id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/warranties/[id]");
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.warranty, "EDIT");
  if (!auth.ok) return auth.response;

  const parsed = warrantyIdParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  const input = updateWarrantySchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  const { id } = parsed.data;
  try {
    const before = await getAdminWarranty(id);
    const result = await updateWarranty(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.warranty,
      recordId: id,
      recordLabel: `${result.productName} (${result.order.number})`,
      before: warrantyAuditView(before),
      after: warrantyAuditView(result),
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/warranties/[id]");
  }
}
