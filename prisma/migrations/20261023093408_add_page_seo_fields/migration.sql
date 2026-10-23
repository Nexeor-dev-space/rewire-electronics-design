-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "homepage_state" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "ogImageId" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "ogImageId" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- AddForeignKey
ALTER TABLE "homepage_state" ADD CONSTRAINT "homepage_state_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_ogImageId_fkey" FOREIGN KEY ("ogImageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
