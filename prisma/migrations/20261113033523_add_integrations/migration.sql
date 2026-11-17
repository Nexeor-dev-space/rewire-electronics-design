-- CreateEnum
CREATE TYPE "IntegrationKey" AS ENUM ('GA4', 'CLARITY', 'SEARCH_CONSOLE', 'META_PIXEL', 'EMAIL', 'STRIPE');

-- CreateTable
CREATE TABLE "integrations" (
    "key" "IntegrationKey" NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3),
    "lastTestOk" BOOLEAN,
    "lastTestMessage" TEXT NOT NULL DEFAULT '',
    "lastTestedAt" TIMESTAMP(3),

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
