-- AlterTable
ALTER TABLE "products" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaKeywords" TEXT[],
ADD COLUMN     "ogDescription" TEXT,
ADD COLUMN     "ogImageId" TEXT,
ADD COLUMN     "ogTitle" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
