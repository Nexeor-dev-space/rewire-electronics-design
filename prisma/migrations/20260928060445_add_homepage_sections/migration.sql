-- CreateEnum
CREATE TYPE "HomepageStage" AS ENUM ('DRAFT', 'LIVE');

-- CreateEnum
CREATE TYPE "HomepageSectionType" AS ENUM ('HERO', 'UPCOMING_DROPS', 'BEST_SELLERS', 'CONDITIONS', 'TESTIMONIALS', 'FAQ', 'INVITATION', 'PROMO_BANNER', 'FEATURED_BRANDS', 'FEATURED_CATEGORIES');

-- CreateTable
CREATE TABLE "homepage_sections" (
    "id" TEXT NOT NULL,
    "stage" "HomepageStage" NOT NULL,
    "type" "HomepageSectionType" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "seasonal" BOOLEAN NOT NULL DEFAULT false,
    "eyebrow" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "imageId" TEXT,
    "refIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_state" (
    "id" TEXT NOT NULL,
    "draftUpdatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "homepage_sections_stage_sortOrder_idx" ON "homepage_sections"("stage", "sortOrder");

-- AddForeignKey
ALTER TABLE "homepage_sections" ADD CONSTRAINT "homepage_sections_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
