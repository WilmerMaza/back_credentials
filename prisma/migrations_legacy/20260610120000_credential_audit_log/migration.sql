-- CreateEnum
CREATE TYPE "CredentialAuditAction" AS ENUM ('CREATE', 'UPDATE');

-- CreateTable
CREATE TABLE "CredentialAuditLog" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "action" "CredentialAuditAction" NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CredentialAuditLog_credentialId_idx" ON "CredentialAuditLog"("credentialId");

-- CreateIndex
CREATE INDEX "CredentialAuditLog_userId_idx" ON "CredentialAuditLog"("userId");

-- CreateIndex
CREATE INDEX "CredentialAuditLog_createdAt_idx" ON "CredentialAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CredentialAuditLog" ADD CONSTRAINT "CredentialAuditLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialAuditLog" ADD CONSTRAINT "CredentialAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
