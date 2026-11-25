import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "minio";
import { PrismaClient } from "../src/generated/prisma/client";
import { databaseEnv, parseStorageEnv } from "../src/lib/env";
import {
  asBuffer,
  mediaObjectMetadata,
  minioClientOptions,
  objectKey,
  publicReadPolicy,
} from "../src/lib/storage/media-object";

/**
 * `npm run db:media-to-minio`: copies every image still held in the database
 * into the MinIO bucket under `media/<id>`. It only reads `data`, so it can run
 * before the new code is deployed, and it is safe to run again: an object
 * already in the bucket at the right size is skipped.
 *
 * `npm run db:media-to-minio -- --clear` also empties `data` on each row once
 * its copy is confirmed — that is what frees the database space. Run it once
 * the site shows images from MinIO.
 */

const CLEAR = process.argv.includes("--clear");

/** Rows per query. Each can carry up to 2 MB, so this stays small. */
const BATCH = 20;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseEnv().DATABASE_URL }),
});
const storage = parseStorageEnv(process.env);
const client = new Client(minioClientOptions(storage));
const bucket = storage.MINIO_BUCKET;

const isMissing = (error: unknown) => {
  const code = typeof error === "object" && error !== null && "code" in error ? (error as { code: unknown }).code : null;
  return code === "NotFound" || code === "NoSuchKey";
};

async function storedSize(key: string): Promise<number | null> {
  try {
    return (await client.statObject(bucket, key)).size;
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

async function ensureBucket() {
  if (!(await client.bucketExists(bucket))) {
    await client.makeBucket(bucket);
    console.log(`Created bucket ${bucket}.`);
  }
  const policy = await client.getBucketPolicy(bucket).catch(() => "");
  if (!policy) {
    await client.setBucketPolicy(bucket, publicReadPolicy(bucket));
    console.log(`Made ${bucket}/media publicly readable.`);
  }
}

async function main() {
  await ensureBucket();

  const counts = { copied: 0, alreadyThere: 0, cleared: 0, failed: 0 };
  let lastId = "";

  for (;;) {
    const rows = await prisma.mediaAsset.findMany({
      where: { id: { gt: lastId }, data: { not: null } },
      select: { id: true, mimeType: true, data: true },
      orderBy: { id: "asc" },
      take: BATCH,
    });
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1]!.id;

    for (const { id, mimeType, data } of rows) {
      if (!data) continue;
      const key = objectKey(id);
      try {
        if ((await storedSize(key)) === data.byteLength) {
          counts.alreadyThere++;
        } else {
          await client.putObject(bucket, key, asBuffer(data), data.byteLength, mediaObjectMetadata(mimeType));
          if ((await storedSize(key)) !== data.byteLength) throw new Error("The stored size doesn't match.");
          counts.copied++;
        }

        if (CLEAR) {
          await prisma.mediaAsset.update({ where: { id }, data: { data: null } });
          counts.cleared++;
        }
      } catch (error) {
        counts.failed++;
        console.error(`${id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  console.log(
    `Copied ${counts.copied}, already in the bucket ${counts.alreadyThere}, ` +
      `${CLEAR ? `cleared ${counts.cleared}, ` : ""}failed ${counts.failed}.`,
  );
  if (!CLEAR && counts.copied + counts.alreadyThere > 0) {
    console.log("Run again with -- --clear once the site shows images from MinIO, to free the database space.");
  }
  if (counts.failed > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
