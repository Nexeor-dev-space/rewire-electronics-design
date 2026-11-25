import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { limitByUser } from "@/lib/rate-limit";
import { sendReleaseTestEmails } from "@/services/release-message.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.releases, "EDIT");
  if (!auth.ok) return auth.response;

  const limited = limitByUser(auth.session.user.id, "releaseTestEmails");
  if (limited) return limited;

  const { id } = await params;
  try {
    return apiSuccess(await sendReleaseTestEmails(id, auth.session.user));
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/releases/[id]/test-emails");
  }
}
