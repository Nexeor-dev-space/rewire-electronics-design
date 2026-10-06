/*
  Warnings:

  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('VIEW', 'EDIT', 'FULL');

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_updatedById_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staffRoleId" TEXT;

-- DropTable
DROP TABLE "role_permissions";

-- DropEnum
DROP TYPE "PermissionAction";

-- CreateTable
CREATE TABLE "staff_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_role_permissions" (
    "roleId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "level" "AccessLevel" NOT NULL,

    CONSTRAINT "staff_role_permissions_pkey" PRIMARY KEY ("roleId","module")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_roles_nameKey_key" ON "staff_roles"("nameKey");

-- CreateIndex
CREATE INDEX "users_staffRoleId_idx" ON "users"("staffRoleId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES "staff_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_role_permissions" ADD CONSTRAINT "staff_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "staff_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
