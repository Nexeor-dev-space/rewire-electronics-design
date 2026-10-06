import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getProduct, purgeProduct } from "@/services/product.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.trash);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getProduct(id, { inTrash: true }));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/trash/products/[id]");
  }
}

/** Deletes a product in Trash for good. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.trash, "DELETE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await getProduct(id, { inTrash: true });
    const result = await purgeProduct(id);
    await recordAudit(auth.session.user, {
      action: "PURGE",
      module: PERMISSIONS.products,
      recordId: id,
      recordLabel: before.name,
      before,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/trash/products/[id]");
  }
}
