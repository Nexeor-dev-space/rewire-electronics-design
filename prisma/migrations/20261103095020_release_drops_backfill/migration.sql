-- Backfill
UPDATE "releases"
SET "slug" = COALESCE(NULLIF(trim(both '-' from regexp_replace(lower("title"), '[^a-z0-9]+', '-', 'g')), ''), 'release') || '-' || right("id", 8),
    "hidden" = NOT "active",
    "reminderOffsetsMinutes" = ARRAY[2880, 60]
WHERE "slug" IS NULL;

-- Backfill
INSERT INTO "release_allocations" ("id", "releaseId", "variantId", "updatedAt")
SELECT gen_random_uuid()::text, r."id", v."id", CURRENT_TIMESTAMP
FROM "releases" r
JOIN "product_variants" v ON v."productId" = r."productId"
ON CONFLICT ("releaseId", "variantId") DO NOTHING;
