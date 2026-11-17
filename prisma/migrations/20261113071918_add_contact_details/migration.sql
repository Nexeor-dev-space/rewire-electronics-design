-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "contactPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactSupportHours" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactWhatsapp" TEXT NOT NULL DEFAULT '';
