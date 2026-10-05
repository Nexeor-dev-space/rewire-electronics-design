import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { getUser } from "@/services/user.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.trash);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getUser(id, { inTrash: true }));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/trash/users/[id]");
  }
}
