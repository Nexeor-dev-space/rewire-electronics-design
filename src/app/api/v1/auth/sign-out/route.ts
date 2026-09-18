import { apiSuccess } from "@/lib/api/api-response";
import { endSession } from "@/lib/auth/session";

export async function POST() {
  await endSession();
  return apiSuccess({ signedOut: true });
}
