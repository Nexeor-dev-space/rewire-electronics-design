-- AlterTable
ALTER TABLE "homepage_section_items" ADD COLUMN     "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "homepage_section_items_categoryId_idx" ON "homepage_section_items"("categoryId");

-- AddForeignKey
ALTER TABLE "homepage_section_items" ADD CONSTRAINT "homepage_section_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "homepage_section_items" ("id", "sectionId", "sortOrder", "visible", "categoryId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, s."id", (r.ord - 1)::int, true, r.category_id, now(), now()
FROM "homepage_sections" s
CROSS JOIN LATERAL unnest(s."refIds") WITH ORDINALITY AS r(category_id, ord)
WHERE s."type" = 'FEATURED_CATEGORIES'
  AND EXISTS (SELECT 1 FROM "categories" c WHERE c."id" = r.category_id);

UPDATE "homepage_sections" SET "refIds" = '{}' WHERE "type" = 'FEATURED_CATEGORIES';
