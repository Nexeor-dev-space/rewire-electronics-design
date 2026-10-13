-- AlterTable
ALTER TABLE "delivery_zones" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryAreaId" TEXT;

-- CreateTable
CREATE TABLE "delivery_areas" (
    "id" TEXT NOT NULL,
    "emirate" "Emirate" NOT NULL,
    "area" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "standardFee" INTEGER,
    "expressFee" INTEGER,
    "standardMinDays" INTEGER,
    "standardMaxDays" INTEGER,
    "expressMinDays" INTEGER,
    "expressMaxDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_areas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_areas_emirate_area_key" ON "delivery_areas"("emirate", "area");

-- CreateIndex
CREATE INDEX "orders_deliveryAreaId_idx" ON "orders"("deliveryAreaId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryAreaId_fkey" FOREIGN KEY ("deliveryAreaId") REFERENCES "delivery_areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
