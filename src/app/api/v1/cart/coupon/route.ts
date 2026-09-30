import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { getSession } from "@/lib/auth/session";
import { COUPON_MESSAGES } from "@/lib/pricing/coupon";
import { limitByUser } from "@/lib/rate-limit";
import { applyCartCoupon, removeCartCoupon } from "@/services/cart.service";
import { applyCouponSchema } from "@/validators/cart.validator";

function signInRequired() {
  return apiError("UNAUTHENTICATED", COUPON_MESSAGES.SIGN_IN_REQUIRED, 401);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return signInRequired();

    const limited = limitByUser(session.user.id, "applyCoupon");
    if (limited) return limited;

    const input = applyCouponSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) {
      return apiError("VALIDATION", "Enter a discount code.", 422,
        z.flattenError(input.error).fieldErrors);
    }

    return apiSuccess(await applyCartCoupon(session.user.id, input.data.code));
  } catch (error) {
    return apiErrorFrom(error, "POST /cart/coupon");
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return signInRequired();
    return apiSuccess(await removeCartCoupon(session.user.id));
  } catch (error) {
    return apiErrorFrom(error, "DELETE /cart/coupon");
  }
}
