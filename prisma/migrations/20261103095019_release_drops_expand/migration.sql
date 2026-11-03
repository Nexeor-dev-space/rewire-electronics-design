-- CreateEnum
CREATE TYPE "ReleaseHoldStatus" AS ENUM ('HELD', 'ORDERED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ReleaseEmailKind" AS ENUM ('WELCOME', 'REMINDER', 'LIVE');

-- CreateEnum
CREATE TYPE "ReleaseEmailStatus" AS ENUM ('SENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "releaseId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "releaseId" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "releaseHoldUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "releases" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "edition" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPerCustomer" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reminderOffsetsMinutes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "slug" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "store_settings" ADD COLUMN     "releaseEmailGraceMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "releaseHoldMinutes" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "release_allocations" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "allocated" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "returned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_holds" (
    "id" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "cartId" TEXT,
    "orderId" TEXT,
    "quantity" INTEGER NOT NULL,
    "status" "ReleaseHoldStatus" NOT NULL DEFAULT 'HELD',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_customer_tallies" (
    "releaseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_customer_tallies_pkey" PRIMARY KEY ("releaseId","userId")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "emailOptIn" BOOLEAN NOT NULL DEFAULT true,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_emails" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "kind" "ReleaseEmailKind" NOT NULL,
    "offsetMinutes" INTEGER NOT NULL DEFAULT 0,
    "status" "ReleaseEmailStatus" NOT NULL DEFAULT 'SENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "release_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "release_allocations_variantId_idx" ON "release_allocations"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "release_allocations_releaseId_variantId_key" ON "release_allocations"("releaseId", "variantId");

-- CreateIndex
CREATE INDEX "release_holds_status_expiresAt_idx" ON "release_holds"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "release_holds_cartId_status_idx" ON "release_holds"("cartId", "status");

-- CreateIndex
CREATE INDEX "release_holds_allocationId_idx" ON "release_holds"("allocationId");

-- CreateIndex
CREATE INDEX "release_holds_orderId_idx" ON "release_holds"("orderId");

-- CreateIndex
CREATE INDEX "release_customer_tallies_userId_idx" ON "release_customer_tallies"("userId");

-- CreateIndex
CREATE INDEX "waitlist_entries_email_idx" ON "waitlist_entries"("email");

-- CreateIndex
CREATE INDEX "waitlist_entries_userId_idx" ON "waitlist_entries"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_releaseId_email_key" ON "waitlist_entries"("releaseId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "release_emails_entryId_kind_offsetMinutes_key" ON "release_emails"("entryId", "kind", "offsetMinutes");

-- CreateIndex
CREATE INDEX "cart_items_releaseId_idx" ON "cart_items"("releaseId");

-- CreateIndex
CREATE INDEX "order_items_releaseId_idx" ON "order_items"("releaseId");

-- CreateIndex
CREATE INDEX "orders_status_releaseHoldUntil_idx" ON "orders"("status", "releaseHoldUntil");

-- CreateIndex
CREATE UNIQUE INDEX "releases_slug_key" ON "releases"("slug");

-- CreateIndex
CREATE INDEX "releases_publishedAt_hidden_startsAt_idx" ON "releases"("publishedAt", "hidden", "startsAt");

-- CreateIndex
CREATE INDEX "releases_completedAt_endsAt_idx" ON "releases"("completedAt", "endsAt");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_allocations" ADD CONSTRAINT "release_allocations_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_allocations" ADD CONSTRAINT "release_allocations_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_holds" ADD CONSTRAINT "release_holds_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "release_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_holds" ADD CONSTRAINT "release_holds_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_holds" ADD CONSTRAINT "release_holds_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_customer_tallies" ADD CONSTRAINT "release_customer_tallies_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_customer_tallies" ADD CONSTRAINT "release_customer_tallies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_emails" ADD CONSTRAINT "release_emails_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "waitlist_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddCheckConstraint
ALTER TABLE "release_allocations" ADD CONSTRAINT "release_allocations_counters_check" CHECK (
    "allocated" >= 0 AND "available" >= 0 AND "reserved" >= 0 AND "sold" >= 0 AND "returned" >= 0
    AND "allocated" = "available" + "reserved" + "sold" + "returned"
);

-- AddCheckConstraint
ALTER TABLE "release_holds" ADD CONSTRAINT "release_holds_quantity_check" CHECK ("quantity" > 0);

-- AddCheckConstraint
ALTER TABLE "release_customer_tallies" ADD CONSTRAINT "release_customer_tallies_quantity_check" CHECK ("quantity" >= 0);

-- AddCheckConstraint
ALTER TABLE "releases" ADD CONSTRAINT "releases_max_per_customer_check" CHECK ("maxPerCustomer" >= 1);

-- AddCheckConstraint
ALTER TABLE "releases" ADD CONSTRAINT "releases_ends_after_starts_check" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");

-- AddCheckConstraint
ALTER TABLE "releases" ADD CONSTRAINT "releases_reminder_offsets_check" CHECK (0 < ALL ("reminderOffsetsMinutes"));

-- AddCheckConstraint
ALTER TABLE "release_emails" ADD CONSTRAINT "release_emails_offset_check" CHECK ("offsetMinutes" >= 0);

-- AddCheckConstraint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_email_lowercase_check" CHECK ("email" = lower("email"));

-- AddCheckConstraint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_release_hold_minutes_check" CHECK ("releaseHoldMinutes" >= 1);

-- AddCheckConstraint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_release_email_grace_check" CHECK ("releaseEmailGraceMinutes" >= 0);
