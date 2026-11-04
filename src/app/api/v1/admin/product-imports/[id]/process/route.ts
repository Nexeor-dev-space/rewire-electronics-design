import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { processImport } from "@/services/product-import-run.service";

/** Saves the next batch of products. The screen repeats it until the import is no longer Pending or Processing. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi(PERMISSIONS.bulkUpload, "CREATE");
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await processImport((await params).id, auth.session.user));
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/product-imports/[id]/process");
  }
}
