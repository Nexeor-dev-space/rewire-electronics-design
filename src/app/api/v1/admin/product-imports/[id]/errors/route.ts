import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { listFailedRows } from "@/services/product-import-run.service";

/** The failed rows with their reasons, for the error report the screen turns into a CSV. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(PERMISSIONS.bulkUpload);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await listFailedRows((await params).id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/product-imports/[id]/errors");
  }
}
