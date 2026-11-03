import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { getCampaign, setCampaignStatus } from "@/services/campaign.service";
import { campaignStatusSchema } from "@/validators/campaign.validator";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.campaigns, "PUBLISH");
  if (!auth.ok) return auth.response;

  const input = campaignStatusSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Choose an action.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    const before = await getCampaign(id);
    const result = await setCampaignStatus(id, input.data.action);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.campaigns,
      recordId: id,
      recordLabel: result.name,
      before: { status: before.status },
      after: { status: result.status },
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PATCH /admin/campaigns/[id]/status");
  }
}
