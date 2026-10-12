import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { getSession } from "@/lib/auth/session";
import { readGuestTokenHash, type CartOwner } from "@/lib/cart-owner";
import { limitByIp, limitByUser } from "@/lib/rate-limit";
import { placeOrder, sendOrderConfirmation } from "@/services/checkout.service";
import { placeOrderSchema } from "@/validators/checkout.validator";

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
    return apiSuccess(order, created ? 201 : 200);
  } catch (error) {
    return apiErrorFrom(error, "POST /checkout");
  }
}
