-- AlterTable
ALTER TABLE "categories" ADD COLUMN "slug" TEXT;

UPDATE "categories"
SET "slug" = NULLIF(trim(both '-' from lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))), '');

UPDATE "categories" AS c
SET "slug" = COALESCE(c."slug", 'category') || '-' || substr(c."id", 1, 6)
WHERE c."slug" IS NULL
   OR EXISTS (
     SELECT 1 FROM "categories" AS o
     WHERE o."slug" = c."slug" AND o."id" < c."id"
   );

ALTER TABLE "categories" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "minPrice" INTEGER NOT NULL DEFAULT 0;

UPDATE "products" AS p
SET "minPrice" = COALESCE(
  (SELECT MIN(v."price") FROM "product_variants" AS v WHERE v."productId" = p."id"),
  0
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "products_status_minPrice_idx" ON "products"("status", "minPrice");
