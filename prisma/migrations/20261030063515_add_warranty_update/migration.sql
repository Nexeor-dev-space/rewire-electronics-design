/*
  Warnings:

  - You are about to drop the column `serialNumber` on the `order_items` table. All the data in the column will be lost.
  - You are about to drop the column `orderItemId` on the `warranty_claims` table. All the data in the column will be lost.
  - Added the required column `deviceId` to the `warranty_claims` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "warranty_claims" DROP CONSTRAINT "warranty_claims_orderItemId_fkey";

-- DropIndex
DROP INDEX "warranty_claims_orderItemId_status_idx";

-- AlterTable
ALTER TABLE "order_items" DROP COLUMN "serialNumber";

-- AlterTable
ALTER TABLE "warranty_claims" DROP COLUMN "orderItemId",
ADD COLUMN     "deviceId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "unitNumber" INTEGER NOT NULL,
    "serialNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_orderItemId_unitNumber_key" ON "devices"("orderItemId", "unitNumber");

-- CreateIndex
CREATE INDEX "warranty_claims_deviceId_status_idx" ON "warranty_claims"("deviceId", "status");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
