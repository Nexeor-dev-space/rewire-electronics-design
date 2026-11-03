import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createCampaignType, listCampaignTypes } from "@/services/campaign.service";
import { campaignTypeSchema } from "@/validators/campaign.validator";
import { paginationQueryValidator } from "@/validators/common/primitives.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.campaigns);
  if (!auth.ok) return auth.response;

  const query = paginationQueryValidator.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid page.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listCampaignTypes(query.data.page, query.data.pageSize));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/campaign-types");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.campaigns, "CREATE");
  if (!auth.ok) return auth.response;

  const input = campaignTypeSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please enter a type name.", 422, z.flattenError(input.error).fieldErrors);
  }

  try {
    const result = await createCampaignType(input.data);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.campaigns,
      recordId: result.id,
      recordLabel: `Type: ${result.name}`,
      after: result,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/campaign-types");
  }
}
