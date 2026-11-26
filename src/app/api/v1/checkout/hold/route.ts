import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { holdCart } from "@/services/release-hold.service";

export async function POST() {
  try {
    const auth = await authorizeApi();
    if (!auth.ok) return auth.response;
    return apiSuccess(await holdCart(auth.session.user.id, new Date()));
  } catch (error) {
    return apiErrorFrom(error, "POST /checkout/hold");
  }
}
