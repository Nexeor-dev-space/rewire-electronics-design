import "server-only";

import { Client } from "minio";
import { ServiceError } from "@/lib/api/api-response";
import { storageEnv } from "@/lib/env";
import { minioClientOptions, publicReadPolicy } from "./media-object";

/**
 * The one MinIO connection. The keys are read here, on the server, and never
 * reach a browser: pages link to objects by their public URL instead.
 */

export interface MediaBucket {
  client: Client;
  bucket: string;
}

export const MESSAGE_STORAGE_NOT_CONFIGURED = "Image storage isn't set up yet. Please try again later.";
export const MESSAGE_STORAGE_UNAVAILABLE = "We couldn't reach image storage. Try again in a moment.";

/** Logs the real cause for us and hands the person a message they can act on. */
export function storageUnavailable(error: unknown): ServiceError {
  console.error("MinIO request failed", error);
  return new ServiceError("NOT_CONFIGURED", MESSAGE_STORAGE_UNAVAILABLE, 503);
}

let connection: MediaBucket | undefined;
let ready: Promise<MediaBucket> | undefined;

function connect() {
  if (connection) return connection;
  try {
    const env = storageEnv();
    connection = { client: new Client(minioClientOptions(env)), bucket: env.MINIO_BUCKET };
    return connection;
  } catch (error) {
    console.error(error);
    throw new ServiceError("NOT_CONFIGURED", MESSAGE_STORAGE_NOT_CONFIGURED, 503);
  }
}

/**
 * The bucket, ready to use. The first call in a process creates it if it is
 * missing and, if it has no policy yet, makes `media/` publicly readable. An
 * existing policy is left alone — whoever set it up by hand knows best. A
 * failure is not remembered, so the next upload tries again.
 */
export function mediaBucket(): Promise<MediaBucket> {
  ready ??= (async () => prepare(connect()))().catch((error: unknown) => {
    ready = undefined;
    throw error;
  });
  return ready;
}

async function prepare({ client, bucket }: MediaBucket): Promise<MediaBucket> {
  try {
    if (!(await client.bucketExists(bucket))) await client.makeBucket(bucket);
  } catch (error) {
    throw storageUnavailable(error);
  }

  try {
    const policy = await client.getBucketPolicy(bucket).catch(() => "");
    if (!policy) await client.setBucketPolicy(bucket, publicReadPolicy(bucket));
  } catch (error) {
    // Uploads still work; only anonymous reads would fail. docs/DEPLOYMENT.md
    // has the one-line `mc anonymous set download` fix.
    console.warn(`Couldn't make ${bucket}/media publicly readable. Set it by hand (docs/DEPLOYMENT.md).`, error);
  }

  return { client, bucket };
}
