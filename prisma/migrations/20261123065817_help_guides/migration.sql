-- CreateTable
CREATE TABLE "help_guides" (
    "id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "recordingUrl" TEXT,
    "sections" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_guide_images" (
    "guideId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,

    CONSTRAINT "help_guide_images_pkey" PRIMARY KEY ("guideId","mediaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "help_guides_audience_slug_key" ON "help_guides"("audience", "slug");

-- AddForeignKey
ALTER TABLE "help_guide_images" ADD CONSTRAINT "help_guide_images_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "help_guides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_guide_images" ADD CONSTRAINT "help_guide_images_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
