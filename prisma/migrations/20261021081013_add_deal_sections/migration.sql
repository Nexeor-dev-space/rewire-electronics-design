-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HomepageSectionType" ADD VALUE 'BEST_DEALS';
ALTER TYPE "HomepageSectionType" ADD VALUE 'SEASON_DEALS';

-- AlterTable
ALTER TABLE "homepage_sections" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3);
