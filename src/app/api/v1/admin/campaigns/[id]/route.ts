import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { recordAudit } from "@/services/audit.service";
import { deleteCampaign, getCampaign, updateCampaign } from "@/services/campaign.service";
import { campaignSchema } from "@/validators/campaign.validator";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.campaigns);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    return apiSuccess(await getCampaign(id));
  } catch (error) {
    return apiErrorFrom(error, "GET /admin/campaigns/[id]");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.campaigns, "EDIT");
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

  const { id } = await params;
  try {
    const before = await getCampaign(id);
    const result = await updateCampaign(id, input.data);
    await recordAudit(auth.session.user, {
      action: "UPDATE",
      module: PERMISSIONS.campaigns,
      recordId: id,
      recordLabel: result.name,
      before,
      after: result,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/campaigns/[id]");
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await authorizeApi(PERMISSIONS.campaigns, "DELETE");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const before = await getCampaign(id);
    const result = await deleteCampaign(id);
    await recordAudit(auth.session.user, {
      action: "DELETE",
      module: PERMISSIONS.campaigns,
      recordId: id,
      recordLabel: before.name,
      before,
    });
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFrom(error, "DELETE /admin/campaigns/[id]");
  }
}
