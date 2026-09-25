import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { authorizeApi } from "@/lib/auth/session";
import { saveImage } from "@/services/media.service";

const UPLOAD_PERMISSIONS = [PERMISSIONS.categories, PERMISSIONS.brands, PERMISSIONS.products];

/**
 * The one image upload, shared by the category, brand and product modals.
 *
 * Takes `multipart/form-data` with a single `file` field, so there is no Zod
 * schema here — a `File` is validated by `saveImage` on type and size.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const { role } = auth.session.user;
  if (!UPLOAD_PERMISSIONS.some((permission) => hasPermission(role, permission))) {
    return apiError("FORBIDDEN", "Your account doesn't have access to this.", 403);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return apiError("VALIDATION", "Choose an image to upload.", 422, {
      file: ["Choose an image to upload."],
    });
  }

  try {
    return apiSuccess(await saveImage(file), 201);
  } catch (error) {
    return apiErrorFrom(error, "POST /uploads/images");
  }
}
