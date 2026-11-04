-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "invoiceIssuedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT;

-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "invoiceSellerAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "invoiceSellerEmail" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "invoiceSellerName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "invoiceSellerTrn" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "invoiceTerms" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lastInvoiceSequence" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "orders_invoiceNumber_key" ON "orders"("invoiceNumber");
