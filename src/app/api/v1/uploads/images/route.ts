import type { NextRequest } from "next/server";
import { apiError, apiErrorFrom, apiSuccess } from "@/lib/api/api-response";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { authorizeApi, forbidden } from "@/lib/auth/session";
import { saveImage } from "@/services/media.service";

const UPLOAD_MODULES = [PERMISSIONS.categories, PERMISSIONS.brands, PERMISSIONS.products, PERMISSIONS.homepage];

/**
 * The one image upload, shared by the category, brand, product and homepage
 * section modals. Open to anyone who can create or edit in one of them.
 *
 * Takes `multipart/form-data` with a single `file` field, so there is no Zod
 * schema here — a `File` is validated by `saveImage` on type and size.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const { permissions } = auth.session.user;
  const canUpload = UPLOAD_MODULES.some(
    (module) => hasPermission(permissions, module, "CREATE") || hasPermission(permissions, module, "EDIT"),
  );
  if (!canUpload) return forbidden();

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
