-- CreateEnum
CREATE TYPE "ProductImportMode" AS ENUM ('CREATE_NEW', 'UPDATE_EXISTING');

-- CreateEnum
CREATE TYPE "ProductImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "ProductImportRowStatus" AS ENUM ('PENDING', 'IMPORTED', 'FAILED');

-- CreateTable
CREATE TABLE "product_imports" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mode" "ProductImportMode" NOT NULL,
    "status" "ProductImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "uploadedByName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_import_rows" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "ProductImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_imports_createdAt_idx" ON "product_imports"("createdAt");

-- CreateIndex
CREATE INDEX "product_imports_status_idx" ON "product_imports"("status");

-- CreateIndex
CREATE INDEX "product_import_rows_importId_status_idx" ON "product_import_rows"("importId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "product_import_rows_importId_rowNumber_key" ON "product_import_rows"("importId", "rowNumber");

-- AddForeignKey
ALTER TABLE "product_imports" ADD CONSTRAINT "product_imports_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_import_rows" ADD CONSTRAINT "product_import_rows_importId_fkey" FOREIGN KEY ("importId") REFERENCES "product_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
