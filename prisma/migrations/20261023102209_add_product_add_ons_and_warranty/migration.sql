-- AlterTable
ALTER TABLE "add_ons" ADD COLUMN     "extraWarrantyMonths" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_item_add_ons" ADD COLUMN     "extraWarrantyMonths" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "warrantyEndsAt" TIMESTAMP(3),
ADD COLUMN     "warrantyStartsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "product_add_ons" (
    "productId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "priceOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_add_ons_pkey" PRIMARY KEY ("productId","addOnId")
);

-- CreateIndex
CREATE INDEX "product_add_ons_addOnId_idx" ON "product_add_ons"("addOnId");

-- AddForeignKey
ALTER TABLE "product_add_ons" ADD CONSTRAINT "product_add_ons_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_add_ons" ADD CONSTRAINT "product_add_ons_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "add_ons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
