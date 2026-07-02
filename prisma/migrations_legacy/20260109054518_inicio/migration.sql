-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "identityNumber" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "enlistmentDate" TIMESTAMP(3) NOT NULL,
    "institutionalEmail" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Credential_identityNumber_key" ON "Credential"("identityNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_institutionalEmail_key" ON "Credential"("institutionalEmail");
