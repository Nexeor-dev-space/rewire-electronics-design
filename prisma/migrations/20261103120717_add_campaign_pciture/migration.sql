-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "bannerImageId" TEXT,
ADD COLUMN     "content" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ctaHref" TEXT,
ADD COLUMN     "ctaLabel" TEXT,
ADD COLUMN     "releaseId" TEXT;

-- CreateTable
CREATE TABLE "campaign_images" (
    "campaignId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_images_pkey" PRIMARY KEY ("campaignId","mediaId")
);

-- CreateIndex
CREATE INDEX "campaign_images_mediaId_idx" ON "campaign_images"("mediaId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_bannerImageId_fkey" FOREIGN KEY ("bannerImageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_images" ADD CONSTRAINT "campaign_images_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_images" ADD CONSTRAINT "campaign_images_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
