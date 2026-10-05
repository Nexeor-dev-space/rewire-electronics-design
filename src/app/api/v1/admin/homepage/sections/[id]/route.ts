import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import {
  deleteHomepageSection,
  findDraftSection,
  updateHomepageSection,
} from "@/services/homepage.service";
import { recordAudit } from "@/services/audit.service";
import { homepageSectionSchema } from "@/validators/homepage.validator";
import { SECTION_RULES } from "@/lib/homepage-sections";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.homepage, "EDIT");
  if (!auth.ok) return auth.response;

  const input = homepageSectionSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  const { id } = await params;
  try {
    const before = await findDraftSection(id);
    const result = await updateHomepageSection(id, input.data);
    const after = result.sections.find((section) => section.id === id);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.homepage,
      recordId: id,
      recordLabel: SECTION_RULES[before.type].label,
      before,
      after,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/homepage/sections/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.homepage, "DELETE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await findDraftSection(id);
    const result = await deleteHomepageSection(id);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: PERMISSIONS.homepage,
      recordId: id,
      recordLabel: SECTION_RULES[before.type].label,
      before,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/homepage/sections/[id]");
  }
}
