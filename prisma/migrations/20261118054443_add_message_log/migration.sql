-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MessageTrigger" AS ENUM ('WAITLIST_WELCOME', 'CAMPAIGN_MESSAGE', 'COUNTDOWN_UPDATE', 'DROP_REMINDER', 'DROP_LIVE', 'BACK_IN_STOCK', 'ABANDONED_CHECKOUT', 'EMAIL_VERIFICATION', 'ACCOUNT_REACTIVATION', 'ORDER_CONFIRMATION', 'ORDER_PAYMENT_RECEIVED', 'ORDER_DISPATCHED', 'DELIVERY_ATTEMPT_FAILED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'DEVICE_RECORD', 'REVIEW_REQUEST', 'ADDON_ENTITLEMENT_SUMMARY', 'ENTITLEMENT_REMINDER', 'WARRANTY_EXPIRY_NOTICE', 'WARRANTY_CLAIM_STATUS', 'WARRANTY_FOLLOW_UP', 'RETURN_UPDATE');

-- CreateTable
CREATE TABLE "message_logs" (
    "id" TEXT NOT NULL,
    "trigger" "MessageTrigger" NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENDING',
    "recipient" TEXT NOT NULL,
    "userId" TEXT,
    "refId" TEXT,
    "refLabel" TEXT NOT NULL DEFAULT '',
    "subject" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_logs_dedupeKey_key" ON "message_logs"("dedupeKey");

-- CreateIndex
CREATE INDEX "message_logs_userId_createdAt_idx" ON "message_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "message_logs_recipient_createdAt_idx" ON "message_logs"("recipient", "createdAt");

-- CreateIndex
CREATE INDEX "message_logs_trigger_refId_idx" ON "message_logs"("trigger", "refId");

-- CreateIndex
CREATE INDEX "message_logs_status_createdAt_idx" ON "message_logs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "message_logs_createdAt_idx" ON "message_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
