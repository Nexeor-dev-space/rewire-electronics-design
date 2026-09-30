import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { resolveCartOwner } from "@/lib/cart-owner";
import { acknowledgeCart } from "@/services/cart.service";

export async function POST() {
  try {
    return apiSuccess(await acknowledgeCart(await resolveCartOwner()));
  } catch (error) {
    return apiErrorFrom(error, "POST /cart/acknowledge");
  }
}
