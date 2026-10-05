import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { createCoupon, listCoupons } from "@/services/coupon.service";
import { couponListQuerySchema, couponSchema } from "@/validators/coupon.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.coupons);
  if (!auth.ok) return auth.response;

  const query = couponListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listCoupons(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/coupons");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.coupons, "CREATE");
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

  try {
    return apiSuccess(await createCoupon(input.data), 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/coupons");
  }
}
