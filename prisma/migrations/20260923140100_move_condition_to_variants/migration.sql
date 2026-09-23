-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN "condition" "ProductCondition",
ADD COLUMN "grade" "ProductGrade",
ADD COLUMN "batteryHealth" INTEGER;

-- Backfill from the owning product
UPDATE "product_variants" AS v
SET "condition" = p."condition", "grade" = p."grade", "batteryHealth" = p."batteryHealth"
FROM "products" AS p
WHERE v."productId" = p."id";

ALTER TABLE "product_variants" ALTER COLUMN "condition" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "batteryHealth",
DROP COLUMN "condition",
DROP COLUMN "grade";
