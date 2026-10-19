import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { handleStripeEvent, verifyWebhookEvent } from "@/services/payment.service";

const SIGNATURE_HEADER = "stripe-signature";

/**
 * Stripe's webhook endpoint. No session and no rate limit: the signature is the
 * check. 200 acknowledges; 400 (bad signature) and 503 (no secret) are logged;
 * any other failure is a 500, so Stripe retries. See docs/PAYMENTS.md §6.
 */
export async function POST(req: NextRequest) {
  try {
    const event = verifyWebhookEvent(await req.text(), req.headers.get(SIGNATURE_HEADER));
    await handleStripeEvent(event);
    return apiSuccess({ received: true });
  } catch (error) {
    return apiErrorFrom(error, "POST /webhooks/stripe");
  }
}
