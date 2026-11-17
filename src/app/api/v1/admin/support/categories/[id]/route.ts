import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { listCategories, updateCategory } from "@/services/support.service";
import { ticketCategoryParamsSchema, ticketCategorySchema } from "@/validators/support.validator";

type Params = { params: Promise<{ id: string }> };

const MESSAGE_NOT_FOUND = "We couldn't find that category.";

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.support, "DELETE");
  if (!auth.ok) return auth.response;

  const parsed = ticketCategoryParamsSchema.safeParse(await params);
  if (!parsed.success) return apiError("NOT_FOUND", MESSAGE_NOT_FOUND, 404);

  const input = ticketCategorySchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please check the highlighted fields.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    const before = (await listCategories()).find((category) => category.id === parsed.data.id) ?? null;
    const category = await updateCategory(parsed.data.id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.support,
      recordId: category.id,
      recordLabel: `Ticket category: ${category.name}`,
      before,
      after: category,
    });
    return apiSuccess(category);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/support/categories/[id]");
  }
}
