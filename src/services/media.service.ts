import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/api/api-response";
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES, formatBytes, isImageMimeType } from "@/lib/media";
import { imageStorage, imageUrl } from "@/lib/storage/image-storage";

/**
 * Uploading and serving images. Both the category and the brand modal upload
 * through here, which is why there is one endpoint rather than two.
 */

const EXTENSIONS = IMAGE_MIME_TYPES.map((mime) => mime.replace("image/", "").toUpperCase()).join(
  ", ",
);

export async function saveImage(file: File) {
  if (!isImageMimeType(file.type)) {
    const message = `That file isn't an image we accept. Use ${EXTENSIONS}.`;
    throw new ServiceError("VALIDATION", message, 422, { file: [message] });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const message = `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`;
    throw new ServiceError("VALIDATION", message, 422, { file: [message] });
  }

  // An image uploaded into a modal that was then cancelled is referenced by
  // nothing. Collecting strays here keeps the table tidy without a scheduled
  // job — and a failed sweep must never fail the upload it was riding on.
  try {
    await imageStorage.sweepOrphans();
  } catch (error) {
    console.error("sweepOrphans failed", error);
  }

  const { id } = await imageStorage.put({
    data: new Uint8Array(await file.arrayBuffer()),
    mimeType: file.type,
  });

  return { id, url: imageUrl(id) };
}

export async function readImage(id: string) {
  const image = await imageStorage.get(id);
  if (!image) {
    throw new ServiceError("NOT_FOUND", "That image no longer exists.", 404);
  }
  return image;
}

/**
 * Deletes an image once nothing points at it. Called inside the caller's
 * transaction, *after* the row that referenced it has been updated or
 * removed, so the "referenced by nothing" test sees the new state.
 */
export async function releaseImage(tx: Prisma.TransactionClient, imageId: string) {
  await tx.mediaAsset.deleteMany({
    where: { id: imageId, categories: { none: {} }, brands: { none: {} } },
  });
}
