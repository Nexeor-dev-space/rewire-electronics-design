-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "lowStockThreshold" INTEGER;

-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "releases_active_startsAt_idx" ON "releases"("active", "startsAt");

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
