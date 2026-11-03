import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { deleteCampaignType, getCampaignType, updateCampaignType } from "@/services/campaign.service";
import { campaignTypeSchema } from "@/validators/campaign.validator";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.campaigns, "EDIT");
  if (!auth.ok) return auth.response;

  const input = campaignTypeSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError("VALIDATION", "Please enter a type name.", 422, z.flattenError(input.error).fieldErrors);
  }

  const { id } = await params;
  try {
    const before = await getCampaignType(id);
    const result = await updateCampaignType(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.campaigns,
      recordId: id,
      recordLabel: `Type: ${result.name}`,
      before,
      after: result,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/campaign-types/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.campaigns, "DELETE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await getCampaignType(id);
    const result = await deleteCampaignType(id);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: PERMISSIONS.campaigns,
      recordId: id,
      recordLabel: `Type: ${before.name}`,
      before,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/campaign-types/[id]");
  }
}
