import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { limitByIp } from "@/lib/rate-limit";
import { confirmCheckoutPayment } from "@/services/payment.service";
import { confirmPaymentSchema } from "@/validators/checkout.validator";

/** The customer is back from Stripe: check the session and return the order. See docs/PAYMENTS.md. */
export async function POST(req: NextRequest) {
  const limited = limitByIp(req, "confirmPayment");
  if (limited) return limited;

  const input = confirmPaymentSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "That payment link isn't valid.", 422,
      z.flattenError(input.error).fieldErrors);
  }

  try {
    return apiSuccess(await confirmCheckoutPayment(input.data.sessionId));
  } catch (error) {
    return apiErrorFrom(error, "POST /checkout/payment");
  }
}
