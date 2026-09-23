import type { NextRequest } from "next/server";
import { apiErrorFrom } from "@/lib/api/api-response";
import { readImage } from "@/services/media.service";

type Params = { params: Promise<{ id: string }> };

/**
 * Serves an uploaded image.
 *
 * Two deliberate departures from the data-layer rules, both recorded in
 * docs/DATA-LAYER.md:
 *
 * 1. **Raw bytes, not `apiSuccess`.** An image cannot be wrapped in a JSON
 *    envelope. Failures still come back through `apiErrorFrom`, so a missing
 *    id answers with the standard error shape.
 * 2. **No session check.** `next/image` routes a local `src` through the
 *    optimiser, which fetches this URL server-side *without* the viewer's
 *    cookies — a guarded route would 401 every thumbnail in the console. The
 *    content is brand and category artwork destined for the storefront
 *    anyway, and ids are cuids rather than a guessable sequence.
 *
 * `immutable` is safe because the id identifies the bytes: changing a
 * category's image produces a new asset with a new id.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const image = await readImage(id);

    return new Response(new Blob([image.data], { type: image.mimeType }), {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return apiErrorFrom(error, "GET /media/[id]");
  }
}
