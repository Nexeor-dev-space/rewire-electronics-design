import type { ClientOptions } from "minio";
import type { StorageEnv } from "../env";

/**
 * How uploaded media is laid out in the MinIO bucket. Shared by the app's
 * storage driver and the `db:media-to-minio` script, which runs under tsx —
 * so no `server-only` import here. Nothing in this file is secret: the keys
 * arrive as arguments from the server-only callers.
 *
 * Imports are relative so the script can load this without path aliases.
 */

/** Every asset lives under this prefix, and only this prefix is publicly readable. */
export const MEDIA_PREFIX = "media/";

/** The object for an asset is named after its id, so names never clash and the URL needs no lookup. */
export function objectKey(id: string): string {
  return `${MEDIA_PREFIX}${id}`;
}

/** The asset id an object belongs to, or null for anything outside `media/`. */
export function idFromObjectKey(key: string): string | null {
  if (!key.startsWith(MEDIA_PREFIX)) return null;
  const id = key.slice(MEDIA_PREFIX.length);
  return id === "" || id.includes("/") ? null : id;
}

/** `immutable` is safe because the id identifies the bytes: a new image is a new asset. */
export const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

export function mediaObjectMetadata(mimeType: string) {
  return { "Content-Type": mimeType, "Cache-Control": MEDIA_CACHE_CONTROL };
}

export function minioClientOptions(env: StorageEnv): ClientOptions {
  return {
    endPoint: env.MINIO_ENDPOINT,
    useSSL: true,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  };
}

/**
 * Anyone may read an object under `media/` — that's what lets the storefront
 * link straight to the bucket. Nobody anonymous may list the bucket or write.
 */
export function publicReadPolicy(bucket: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/${MEDIA_PREFIX}*`],
      },
    ],
  });
}

/** The same bytes as a Buffer, which is what the MinIO client uploads — a view, not a copy. */
export function asBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}
