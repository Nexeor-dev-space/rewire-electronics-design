import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getHomepageDraft, reorderHomepageSections } from "@/services/homepage.service";
import { reorderHomepageSchema } from "@/validators/homepage.validator";
import { SECTION_RULES } from "@/lib/homepage-sections";

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.homepage, "EDIT");
  if (!auth.ok) return auth.response;

  const input = reorderHomepageSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Invalid order.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    const before = await getHomepageDraft();
    const result = await reorderHomepageSections(input.data.ids);
    const order = (draft: typeof result) =>
      draft.sections.map((section) => SECTION_RULES[section.type].label);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.homepage,
      recordLabel: "Section order",
      before: { order: order(before) },
      after: { order: order(result) },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/homepage/order");
  }
}
