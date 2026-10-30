-- CreateEnum
CREATE TYPE "WarrantyClaimStatus" AS ENUM ('RAISED', 'SERIAL_VERIFICATION', 'COLLECTION', 'ASSESSMENT', 'REPAIR', 'REPLACEMENT', 'RETURNED_TO_CUSTOMER', 'DECLINED');

-- CreateTable
CREATE TABLE "warranty_claims" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "status" "WarrantyClaimStatus" NOT NULL DEFAULT 'RAISED',
    "issue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranty_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranty_claim_events" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "status" "WarrantyClaimStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranty_claim_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warranty_claims_number_key" ON "warranty_claims"("number");

-- CreateIndex
CREATE INDEX "warranty_claims_orderItemId_status_idx" ON "warranty_claims"("orderItemId", "status");

-- CreateIndex
CREATE INDEX "warranty_claims_status_createdAt_idx" ON "warranty_claims"("status", "createdAt");

-- CreateIndex
CREATE INDEX "warranty_claim_events_claimId_createdAt_idx" ON "warranty_claim_events"("claimId", "createdAt");

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claim_events" ADD CONSTRAINT "warranty_claim_events_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "warranty_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claim_events" ADD CONSTRAINT "warranty_claim_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
