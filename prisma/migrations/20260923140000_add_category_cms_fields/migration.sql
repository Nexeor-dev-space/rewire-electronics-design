-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "showInNav" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "CategoryStatus" NOT NULL DEFAULT 'PUBLISHED';

-- CreateIndex
CREATE INDEX "categories_status_sortOrder_idx" ON "categories"("status", "sortOrder");
