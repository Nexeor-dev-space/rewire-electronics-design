import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createCategory, listCategories } from "@/services/support.service";
import { ticketCategorySchema } from "@/validators/support.validator";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.support);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await listCategories());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/support/categories");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.support, "DELETE");
  if (!auth.ok) return auth.response;

  const input = ticketCategorySchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    const category = await createCategory(input.data);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.support,
      recordId: category.id,
      recordLabel: `Ticket category: ${category.name}`,
      after: category,
    });
    return apiSuccess(category, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/support/categories");
  }
}
