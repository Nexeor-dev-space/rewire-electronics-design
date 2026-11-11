-- CreateTable
CREATE TABLE "navigation_state" (
    "id" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "live" JSONB,
    "previous" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "navigation_state_pkey" PRIMARY KEY ("id")
);
