import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { endSession, getSession, hasSessionCookie } from "@/lib/auth/session";
import type { Me } from "@/types/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      if (await hasSessionCookie()) await endSession();
      return apiSuccess<Me | null>(null);
    }

    const { createdAt, ...user } = session.user;
    return apiSuccess<Me | null>({ ...user, createdAt: createdAt.toISOString() });
  } catch (error) {
    return apiErrorFrom(error, "GET /auth/me");
  }
}
