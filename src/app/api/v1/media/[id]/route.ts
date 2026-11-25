import type { NextRequest } from "next/server";
import { apiErrorFrom } from "@/lib/api/api-response";
import { MEDIA_CACHE_CONTROL } from "@/lib/storage/media-object";
import { resolveImageLink } from "@/services/media.service";

type Params = { params: Promise<{ id: string }> };

/**
 * The old address of an uploaded image. Pages now link straight to the MinIO
 * bucket; this route keeps every `/api/v1/media/<id>` link already out there —
 * old order emails, search results, shared pages — working.
 *
 * - Moved to the bucket: a permanent redirect to its bucket address. Cached
 *   for a day, not forever, in case the public media address ever changes.
 * - Still in the database (not yet moved by `npm run db:media-to-minio`), or
 *   storage isn't set up: the bytes themselves.
 *
 * Two deliberate departures from the data-layer rules, both recorded in
 * docs/DATA-LAYER.md:
 *
 * 1. **Raw bytes or a redirect, not `apiSuccess`.** An image cannot be wrapped
 *    in a JSON envelope. Failures still come back through `apiErrorFrom`, so a
 *    missing id answers with the standard error shape.
 * 2. **No session check.** `next/image` fetches without the viewer's cookies,
 *    and the content is storefront artwork that is public in the bucket anyway.
 *    Ids are cuids rather than a guessable sequence.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const link = await resolveImageLink(id);

    if ("redirect" in link) {
      return new Response(null, {
        status: 308,
        headers: { Location: link.redirect, "Cache-Control": "public, max-age=86400" },
      });
    }

    return new Response(new Blob([link.image.data], { type: link.image.mimeType }), {
      headers: { "Content-Type": link.image.mimeType, "Cache-Control": MEDIA_CACHE_CONTROL },
    });
  } catch (error) {
    return apiErrorFrom(error, "GET /media/[id]");
  }
}
