/**
 * What counts as an uploadable image. Client-safe — no Prisma import — so the
 * upload field can reject a file before sending it and the route can reject
 * the same file again on arrival. The server check is the one that counts.
 */

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
] as const;

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** For an `<input type="file">` accept attribute. */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(",");

export function isImageMimeType(value: string): value is ImageMimeType {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

/** "2 MB" — for the hint under the field and the rejection message. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
