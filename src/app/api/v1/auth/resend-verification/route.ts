import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { authorizeApi } from "@/lib/auth/session";
import { limitByUser } from "@/lib/rate-limit";
import { resendVerification } from "@/services/auth.service";

export async function POST() {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const limited = limitByUser(auth.session.user.id, "resendVerification");
  if (limited) return limited;

  try {
    await resendVerification(auth.session.user);
    return apiSuccess({ sent: true });
  } catch (error) {
    return apiErrorFrom(error, "POST /auth/resend-verification");
  }
}
