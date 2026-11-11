import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { sectionIssueErrors } from "@/validators/homepage.validator";
import { navigationSchema } from "@/validators/navigation.validator";
import { getNavigationDraft, saveNavigationDraft } from "@/services/navigation.service";

/** One small bounded document (limits in constants.ts), so not paginated. See docs/NAVIGATION.md. */
export async function GET() {
  const auth = await authorizeApi(PERMISSIONS.navigation);
  if (!auth.ok) return auth.response;

  try {
    return apiSuccess(await getNavigationDraft());
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/navigation");
  }
}

/** Replaces the whole draft. The change log records a publish, not each draft save. */
export async function PUT(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.navigation, "EDIT");
  if (!auth.ok) return auth.response;

  const input = navigationSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      sectionIssueErrors(input.error),
    );
  }

  try {
    return apiSuccess(await saveNavigationDraft(input.data));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/navigation");
  }
}
