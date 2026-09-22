import "server-only";

import { API_ENDPOINTS } from "@/lib/api/api-endpoints";
import { prisma } from "@/lib/db";

/**
 * Where uploaded images live. Nothing outside this file touches `MediaAsset`,
 * so moving the bytes to object storage means writing a second driver for this
 * interface — no route, service or component changes, and assets keep their
 * `id`, so URLs already in the wild stay valid.
 *
 * Today the driver is Postgres: right for a few dozen category and brand
 * images, wrong once products carry galleries.
 */

export interface StoredImage {
  data: Uint8Array;
  mimeType: string;
}

export interface ImageStorage {
  put(input: StoredImage): Promise<{ id: string }>;
  get(id: string): Promise<StoredImage | null>;
  /** Removes unreferenced assets past the grace period. Returns how many. */
  sweepOrphans(): Promise<number>;
}

/**
 * An image uploaded into a modal that is then cancelled is referenced by
 * nothing. The grace period is what stops the sweep collecting an image
 * uploaded seconds ago into a modal that is still open.
 */
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

const prismaImageStorage: ImageStorage = {
  async put({ data, mimeType }) {
    return prisma.mediaAsset.create({
      data: { data, mimeType },
      select: { id: true },
    });
  },

  async get(id) {
    return prisma.mediaAsset.findUnique({
      where: { id },
      select: { data: true, mimeType: true },
    });
  },

  async sweepOrphans() {
    const { count } = await prisma.mediaAsset.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - ORPHAN_GRACE_MS) },
        categories: { none: {} },
        brands: { none: {} },
      },
    });
    return count;
  },
};

export const imageStorage = prismaImageStorage;

/** The public URL for an asset. Built here so no component types a path. */
export function imageUrl(id: string): string {
  return API_ENDPOINTS.media.detail(id);
}

export function imageUrlOrNull(id: string | null): string | null {
  return id === null ? null : imageUrl(id);
}
