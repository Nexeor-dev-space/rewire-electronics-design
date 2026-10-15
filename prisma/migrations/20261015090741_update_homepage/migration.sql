-- AlterTable
ALTER TABLE "homepage_sections" ADD COLUMN     "mobileImageId" TEXT;

-- CreateTable
CREATE TABLE "homepage_section_items" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "productId" TEXT,
    "title" TEXT,
    "body" TEXT,
    "author" TEXT,
    "rating" INTEGER,
    "releaseAt" TIMESTAMP(3),
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "imageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_section_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homepage_section_items_sectionId_sortOrder_idx" ON "homepage_section_items"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "homepage_section_items_productId_idx" ON "homepage_section_items"("productId");

-- AddForeignKey
ALTER TABLE "homepage_sections" ADD CONSTRAINT "homepage_sections_mobileImageId_fkey" FOREIGN KEY ("mobileImageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_section_items" ADD CONSTRAINT "homepage_section_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "homepage_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_section_items" ADD CONSTRAINT "homepage_section_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_section_items" ADD CONSTRAINT "homepage_section_items_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
