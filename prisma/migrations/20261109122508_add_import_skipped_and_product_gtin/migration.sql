/*
  Warnings:

  - A unique constraint covering the columns `[gtin]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "ProductImportRowStatus" ADD VALUE 'SKIPPED';

-- AlterTable
ALTER TABLE "product_imports" ADD COLUMN     "skippedRows" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "gtin" TEXT,
ADD COLUMN     "shortDescription" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "products_gtin_key" ON "products"("gtin");
