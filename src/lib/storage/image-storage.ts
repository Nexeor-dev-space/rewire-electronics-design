import "server-only";

import type { Readable } from "node:stream";
import type { Prisma } from "@/generated/prisma/client";
import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import { ServiceError } from "@/lib/api/api-response";
import { prisma } from "@/lib/db";
import { optionalMediaPublicUrl } from "@/lib/env";
import { IMAGE_MIME_TYPES, isImageMimeType } from "@/lib/media";
import { asBuffer, idFromObjectKey, mediaObjectMetadata, objectKey } from "./media-object";
import { mediaBucket, storageUnavailable } from "./minio";

/**
 * Where uploaded images live. Nothing outside this file touches `MediaAsset`
 * storage, so routes, services and components never change when it does.
 *
 * The bytes live in MinIO under `media/<id>`; the `MediaAsset` row keeps the
 * id, the type and every relation pointing at the image. Rows uploaded before
 * the move still carry their bytes in `data` until `npm run db:media-to-minio
 * -- --clear` empties it, and are read from there until then.
 */

export interface StoredImage {
  /**
   * Explicitly backed by an `ArrayBuffer`, which is how Prisma types `Bytes`
   * and what `BlobPart` accepts. Bare `Uint8Array` widens to
   * `ArrayBufferLike`, which allows `SharedArrayBuffer` and satisfies
   * neither.
   */
  data: Uint8Array<ArrayBuffer>;
  mimeType: string;
}

/** Where an asset's bytes are: in the bucket, or still in the database row. */
export type ImageLocation = { kind: "bucket" } | { kind: "database"; image: StoredImage };

export interface ImageStorage {
  put(input: StoredImage): Promise<{ id: string }>;
  get(id: string): Promise<StoredImage | null>;
  locate(id: string): Promise<ImageLocation | null>;
  /** Removes unreferenced assets past the grace period. Returns how many. */
  sweepOrphans(): Promise<number>;
}

/**
 * "Referenced by nothing", across every relation on `MediaAsset`. A new
 * relation must be added here, or the sweep would delete images it uses.
 */
export const UNREFERENCED_MEDIA = {
  categories: { none: {} },
  brands: { none: {} },
  productImages: { none: {} },
  productOgImages: { none: {} },
  homepageSections: { none: {} },
  homepageMobileSections: { none: {} },
  homepageItems: { none: {} },
  orderItems: { none: {} },
  policyOgImages: { none: {} },
  homepageOgImages: { none: {} },
  campaignBanners: { none: {} },
  campaignImages: { none: {} },
  helpGuideImages: { none: {} },
} satisfies Prisma.MediaAssetWhereInput;

/**
 * An image uploaded into a modal that is then cancelled is referenced by
 * nothing. The grace period is what stops the sweep collecting an image
 * uploaded seconds ago into a modal that is still open.
 */
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/** How many rows or objects one sweep step looks at. */
const SWEEP_BATCH = 500;

/**
 * Listing the bucket is the expensive part of the sweep, so it runs at most
 * this often per server process rather than on every upload.
 */
const STRAY_SWEEP_INTERVAL_MS = 60 * 60 * 1000;
let lastStraySweepAt = 0;

const EXTENSIONS = IMAGE_MIME_TYPES.map((mime) => mime.replace("image/", "").toUpperCase()).join(", ");

const isMissingObject = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && (error as { code: unknown }).code === "NoSuchKey";

async function readAll(stream: Readable): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const joined = Buffer.concat(chunks);
  const data = new Uint8Array(joined.byteLength);
  data.set(joined);
  return data;
}

/** Best effort: a leftover object is harmless, and the stray sweep collects it later. */
async function removeObjects(ids: string[]) {
  if (ids.length === 0) return;
  try {
    const { client, bucket } = await mediaBucket();
    await client.removeObjects(bucket, ids.map(objectKey));
  } catch (error) {
    console.error("Removing media objects failed", error);
  }
}

/**
 * `releaseImage` deletes rows inside other services' transactions, where
 * deleting the object too would break the image if the transaction then rolled
 * back. So those objects are left behind, and collected here: anything under
 * `media/` past the grace period whose row no longer exists.
 *
 * That is why each environment needs its own bucket: this database can't see
 * another environment's rows, so their objects would look like strays.
 */
async function sweepStrayObjects(cutoff: Date) {
  if (Date.now() - lastStraySweepAt < STRAY_SWEEP_INTERVAL_MS) return;
  lastStraySweepAt = Date.now();

  try {
    const { client, bucket } = await mediaBucket();
    let batch: string[] = [];

    const flush = async () => {
      if (batch.length === 0) return;
      const rows = await prisma.mediaAsset.findMany({ where: { id: { in: batch } }, select: { id: true } });
      const kept = new Set(rows.map((row) => row.id));
      const strays = batch.filter((id) => !kept.has(id));
      batch = [];
      if (strays.length > 0) await client.removeObjects(bucket, strays.map(objectKey));
    };

    for await (const item of client.listObjectsV2(bucket, "media/", true)) {
      const id = item.name ? idFromObjectKey(item.name) : null;
      if (!id || !item.lastModified || item.lastModified >= cutoff) continue;
      batch.push(id);
      if (batch.length >= SWEEP_BATCH) await flush();
    }
    await flush();
  } catch (error) {
    console.error("Sweeping stray media objects failed", error);
  }
}

const minioImageStorage: ImageStorage = {
  async put({ data, mimeType }) {
    // The upload route checks this too; the bulk import trusts the remote
    // server's content-type, so the last word is here.
    if (!isImageMimeType(mimeType)) {
      const message = `That file isn't an image we accept. Use ${EXTENSIONS}.`;
      throw new ServiceError("VALIDATION", message, 422, { file: [message] });
    }

    const { client, bucket } = await mediaBucket();

    // The row comes first because its id names the object.
    const { id } = await prisma.mediaAsset.create({ data: { mimeType }, select: { id: true } });
    try {
      await client.putObject(bucket, objectKey(id), asBuffer(data), data.byteLength, mediaObjectMetadata(mimeType));
    } catch (error) {
      await prisma.mediaAsset.delete({ where: { id } }).catch(() => {});
      throw storageUnavailable(error);
    }
    return { id };
  },

  async get(id) {
    const row = await prisma.mediaAsset.findUnique({ where: { id }, select: { mimeType: true, data: true } });
    if (!row) return null;
    if (row.data) return { data: row.data, mimeType: row.mimeType };

    const { client, bucket } = await mediaBucket();
    try {
      return { data: await readAll(await client.getObject(bucket, objectKey(id))), mimeType: row.mimeType };
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw storageUnavailable(error);
    }
  },

  async locate(id) {
    const row = await prisma.mediaAsset.findUnique({ where: { id }, select: { mimeType: true, data: true } });
    if (!row) return null;
    return row.data ? { kind: "database", image: { data: row.data, mimeType: row.mimeType } } : { kind: "bucket" };
  },

  async sweepOrphans() {
    const cutoff = new Date(Date.now() - ORPHAN_GRACE_MS);
    let count = 0;

    const candidates = await prisma.mediaAsset.findMany({
      where: { createdAt: { lt: cutoff }, ...UNREFERENCED_MEDIA },
      select: { id: true },
      take: SWEEP_BATCH,
    });

    if (candidates.length > 0) {
      const ids = candidates.map((row) => row.id);
      // Re-checked on delete: one may have been picked up since the read.
      ({ count } = await prisma.mediaAsset.deleteMany({ where: { id: { in: ids }, ...UNREFERENCED_MEDIA } }));
      if (count > 0) {
        const survivors = await prisma.mediaAsset.findMany({ where: { id: { in: ids } }, select: { id: true } });
        const kept = new Set(survivors.map((row) => row.id));
        await removeObjects(ids.filter((id) => !kept.has(id)));
      }
    }

    await sweepStrayObjects(cutoff);
    return count;
  },
};

export const imageStorage = minioImageStorage;

/** The bucket address for an asset, or null while storage isn't set up. */
export function publicImageUrl(id: string): string | null {
  const base = optionalMediaPublicUrl();
  return base ? `${base}/${objectKey(id)}` : null;
}

/**
 * The URL for an asset. Built here so no component types a path. Points
 * straight at the bucket; until storage is set up it falls back to the app's
 * own media route, which still serves bytes held in the database.
 */
export function imageUrl(id: string): string {
  return publicImageUrl(id) ?? API_ENDPOINTS.media.detail(id);
}

export function imageUrlOrNull(id: string | null): string | null {
  return id === null ? null : imageUrl(id);
}
