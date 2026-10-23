import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getHomepageSeo, updateHomepageSeo } from "@/services/homepage.service";
import { homepageSeoSchema } from "@/validators/homepage.validator";

const AUDIT_LABEL = "Homepage SEO";

export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.homepage);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getHomepageSeo());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/homepage/seo");
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.homepage, "PUBLISH");
  if (!auth.ok) return auth.response;

  const input = homepageSeoSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const before = await getHomepageSeo();
    const after = await updateHomepageSeo(input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.homepage,
      recordLabel: AUDIT_LABEL,
      before,
      after,
    });
    return apiSuccess(after);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/homepage/seo");
  }
}
