/*
  Warnings:

  - You are about to drop the `integration_credentials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `integration_settings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "integration_credentials" DROP CONSTRAINT "integration_credentials_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "integration_settings" DROP CONSTRAINT "integration_settings_updatedById_fkey";

-- DropTable
DROP TABLE "integration_credentials";

-- DropTable
DROP TABLE "integration_settings";

-- DropEnum
DROP TYPE "IntegrationKey";

-- DropEnum
DROP TYPE "IntegrationMode";
