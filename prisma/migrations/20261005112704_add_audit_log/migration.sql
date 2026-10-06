-- AlterEnum
ALTER TYPE "PermissionAction" ADD VALUE 'RESTORE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT,
    "recordLabel" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_module_createdAt_idx" ON "audit_logs"("module", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_recordId_idx" ON "audit_logs"("recordId");

-- CreateIndex
CREATE INDEX "products_deletedAt_idx" ON "products"("deletedAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
