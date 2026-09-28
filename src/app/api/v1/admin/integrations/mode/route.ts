import type { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { setIntegrationMode } from "@/services/integration.service";
import { integrationModeSchema } from "@/validators/integration.validator";
import { authorizeIntegrations } from "../authorize";

export async function PUT(req: NextRequest) {
  const auth = await authorizeIntegrations();
  if (!auth.ok) return auth.response;

  const input = integrationModeSchema.safeParse(await req.json().catch(() => null));
  if (!input.success) {
    return apiError(
      "VALIDATION",
      "Please choose DEV or LIVE.",
      422,
      z.flattenError(input.error).fieldErrors,
    );
  }

  try {
    return apiSuccess(await setIntegrationMode(input.data.mode, auth.session.user.id));
  } catch (error) {
    return apiErrorFrom(error, "PUT /admin/integrations/mode");
  }
}
