import type { NextRequest } from "next/server";
import { apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { refreshStorefrontCatalogue } from "@/services/catalogue.service";
import { restoreProduct } from "@/services/product.service";

type Params = { params: Promise<{ id: string }> };

/** Back to the Products list as a Draft. */
export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.trash, "RESTORE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const result = await restoreProduct(id);
    refreshStorefrontCatalogue();
    await recordAudit(auth.session.user, {
      action: "RESTORE",
      module: PERMISSIONS.products,
      recordId: id,
      recordLabel: result.name,
      after: { status: result.status },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/trash/products/[id]/restore");
  }
}
