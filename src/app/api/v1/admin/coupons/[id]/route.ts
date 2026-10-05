import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { deleteCoupon, getCoupon, updateCoupon } from "@/services/coupon.service";
import { couponSchema } from "@/validators/coupon.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.coupons);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getCoupon(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/coupons/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.coupons, "EDIT");
  if (!auth.ok) return auth.response;

  const input = couponSchema.safeParse(await req.json().catch(() => null));
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
    const before = await getCoupon(id);
    const result = await updateCoupon(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.coupons,
      recordId: id,
      recordLabel: result.code,
      before,
      after: result,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/coupons/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.coupons, "DELETE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await getCoupon(id);
    const result = await deleteCoupon(id);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: PERMISSIONS.coupons,
      recordId: id,
      recordLabel: before.code,
      before,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/coupons/[id]");
  }
}
