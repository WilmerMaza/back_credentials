/*
  Warnings:

  - You are about to drop the column `birthDate` on the `Credential` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `Credential` table. All the data in the column will be lost.
  - You are about to drop the column `identityNumber` on the `Credential` table. All the data in the column will be lost.
  - You are about to drop the column `institutionalEmail` on the `Credential` table. All the data in the column will be lost.
  - Added the required column `credentialTypeId` to the `Credential` table without a default value. This is not possible if the table is not empty.
  - Added the required column `personId` to the `Credential` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED');

-- DropIndex
DROP INDEX "Credential_identityNumber_key";

-- DropIndex
DROP INDEX "Credential_institutionalEmail_key";

-- AlterTable
ALTER TABLE "Credential" DROP COLUMN "birthDate",
DROP COLUMN "fullName",
DROP COLUMN "identityNumber",
DROP COLUMN "institutionalEmail",
ADD COLUMN     "credentialTypeId" TEXT NOT NULL,
ADD COLUMN     "expirationDate" TIMESTAMP(3),
ADD COLUMN     "issueDate" TIMESTAMP(3),
ADD COLUMN     "personId" TEXT NOT NULL,
ADD COLUMN     "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "rank" DROP NOT NULL,
ALTER COLUMN "unit" DROP NOT NULL,
ALTER COLUMN "enlistmentDate" DROP NOT NULL,
ALTER COLUMN "imagePath" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "typeIdentity" TEXT NOT NULL,
    "identityNumber" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "institutionalEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_identityNumber_key" ON "Person"("identityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Person_institutionalEmail_key" ON "Person"("institutionalEmail");

-- CreateIndex
CREATE UNIQUE INDEX "CredentialType_code_key" ON "CredentialType"("code");

-- CreateIndex
CREATE INDEX "Credential_personId_idx" ON "Credential"("personId");

-- CreateIndex
CREATE INDEX "Credential_credentialTypeId_idx" ON "Credential"("credentialTypeId");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_credentialTypeId_fkey" FOREIGN KEY ("credentialTypeId") REFERENCES "CredentialType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
