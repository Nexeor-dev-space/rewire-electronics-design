import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { getSession } from "@/lib/auth/session";
import { readGuestTokenHash, type CartOwner } from "@/lib/cart-owner";
import { paysOnline } from "@/lib/orders";
import { limitByIp, limitByUser } from "@/lib/rate-limit";
import { placeOrder, sendOrderConfirmation } from "@/services/checkout.service";
import { startOnlinePayment } from "@/services/payment.service";
import type { OrderDetail, PlacedOrder } from "@/types/order";
import { placeOrderSchema } from "@/validators/checkout.validator";

function awaitsOnlinePayment(order: OrderDetail): boolean {
  return paysOnline(order.paymentMethod) && order.status === "PENDING_PAYMENT" && order.paymentStatus === "UNPAID";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const limited = session ? limitByUser(session.user.id, "placeOrder") : limitByIp(req, "placeOrder");
    if (limited) return limited;

    const input = placeOrderSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) {
      return apiError("VALIDATION", "Please check the highlighted fields.", 422,
        z.flattenError(input.error).fieldErrors);
    }

    const tokenHash = session ? null : await readGuestTokenHash();
    const owner: CartOwner = session
      ? { kind: "user", userId: session.user.id }
      : tokenHash
        ? { kind: "guest", tokenHash }
        : null;

    const { order, created } = await placeOrder(owner, session?.user ?? null, input.data);
    if (created) {
      after(() =>
        sendOrderConfirmation(order).catch((error: unknown) =>
          console.error("POST /checkout confirmation email failed", error),
        ),
      );
    }

    // A replay of an unpaid order reuses its open Stripe page, or opens one if the last call failed.
    const placed: PlacedOrder = awaitsOnlinePayment(order) ? await startOnlinePayment(order) : { order, paymentUrl: null };
    return apiSuccess(placed, created ? 201 : 200);
  } catch (error) {
    return apiErrorFrom(error, "POST /checkout");
  }
}
