import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { resolveCartOwner, setGuestCartCookie } from "@/lib/cart-owner";
import { limitByIp } from "@/lib/rate-limit";
import { addCartItem } from "@/services/cart.service";
import { addCartItemSchema } from "@/validators/cart.validator";

export async function POST(req: NextRequest) {
  try {
    const owner = await resolveCartOwner();
    if (!owner) {
      const limited = limitByIp(req, "guestCart");
      if (limited) return limited;
    }

    const input = addCartItemSchema.safeParse(await req.json().catch(() => null));
    if (!input.success) {
      return apiError("VALIDATION", "Please check the item and try again.", 422,
        z.flattenError(input.error).fieldErrors);
    }

    const { cart, newGuestToken } = await addCartItem(owner, input.data);
    if (newGuestToken) await setGuestCartCookie(newGuestToken);
    return apiSuccess(cart, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /cart/items");
  }
}
