import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { clearGuestCartCookie, resolveCartOwner } from "@/lib/cart-owner";
import { getCart } from "@/services/cart.service";

export async function GET() {
  try {
    const owner = await resolveCartOwner();
    const cart = await getCart(owner);
    if (owner?.kind !== "user" && cart.id === null) await clearGuestCartCookie();
    return apiSuccess(cart);
  } catch (error) {
    return apiErrorFrom(error, "GET /cart");
  }
}
