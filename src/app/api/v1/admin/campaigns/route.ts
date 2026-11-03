import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { createCampaign, listCampaigns } from "@/services/campaign.service";
import { campaignListQuerySchema, campaignSchema } from "@/validators/campaign.validator";

export async function GET(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.campaigns);
  if (!auth.ok) return auth.response;

  const query = campaignListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) {
    return apiError("VALIDATION", "Invalid search.", 422, z.flattenError(query.error).fieldErrors);
  }

  try {
    return apiSuccess(await listCampaigns(query.data));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/campaigns");
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi(PERMISSIONS.campaigns, "CREATE");
  if (!auth.ok) return auth.response;

  const input = campaignSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please check the highlighted fields.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    const result = await createCampaign(input.data);
    await recordAudit(auth.session.user, {
      action: "CREATE",
      module: PERMISSIONS.campaigns,
      recordId: result.id,
      recordLabel: result.name,
      after: result,
    });
    return apiSuccess(result, 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /admin/campaigns");
  }
}
