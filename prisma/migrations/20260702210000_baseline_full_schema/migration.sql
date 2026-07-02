-- CreateEnum
CREATE TYPE "CredentialAuditAction" AS ENUM ('CREATE', 'UPDATE');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'SUSPENDED', 'PENDING', 'TRANSFERRED');

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "imagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "credentialTypeId" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "issueDate" TIMESTAMP(3),
    "personId" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "details" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "CredentialType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schema" JSONB NOT NULL DEFAULT '{"fields": []}',

    CONSTRAINT "CredentialType_pkey" PRIMARY KEY ("id")
);

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
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Credential_credentialTypeId_idx" ON "Credential"("credentialTypeId" ASC);

-- CreateIndex
CREATE INDEX "Credential_personId_idx" ON "Credential"("personId" ASC);

-- CreateIndex
CREATE INDEX "CredentialAuditLog_createdAt_idx" ON "CredentialAuditLog"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "CredentialAuditLog_credentialId_idx" ON "CredentialAuditLog"("credentialId" ASC);

-- CreateIndex
CREATE INDEX "CredentialAuditLog_userId_idx" ON "CredentialAuditLog"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CredentialType_code_key" ON "CredentialType"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Person_identityNumber_key" ON "Person"("identityNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Person_institutionalEmail_key" ON "Person"("institutionalEmail" ASC);

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt" ASC);

-- CreateIndex
CREATE INDEX "Session_familyId_idx" ON "Session"("familyId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash" ASC);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId" ASC);

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_credentialTypeId_fkey" FOREIGN KEY ("credentialTypeId") REFERENCES "CredentialType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialAuditLog" ADD CONSTRAINT "CredentialAuditLog_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialAuditLog" ADD CONSTRAINT "CredentialAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: tipos de credencial (estado actual de la base de datos)

INSERT INTO "CredentialType" ("id", "code", "name", "description", "schema", "createdAt")
VALUES (
  'cmpc4zsfc0002sq7rw9p18npy',
  'alumnos_baena',
  'Alumnos BAENA',
  'Credencial para alumnos BAENA',
  '{"fields":[{"name":"grado","type":"select","label":"Grado","options":["cadete","guardiamarina","alferez"],"required":true,"optionLabels":{"cadete":"Cadete","alferez":"Alférez","guardiamarina":"Guardiamarina"}},{"name":"compania","type":"select","label":"Compañía","required":true,"dependsOn":"grado","optionLabels":{"tono":"Tono","brion":"Brion","binney":"Binney","padilla":"Padilla"},"optionsByParent":{"cadete":["binney","tono","brion","padilla"],"alferez":["binney","tono","brion","padilla"],"guardiamarina":["binney","tono","brion","padilla"]}},{"name":"curso","type":"select","label":"Curso","required":true,"dependsOn":"compania","optionsByParent":{"tono":["1.1","1.2","2.1","2.2","3.1","3.2","4.1","4.2"],"brion":["1.1","1.2","2.1","2.2","3.1","3.2","4.1","4.2"],"binney":["1.1","1.2","2.1","2.2","3.1","3.2","4.1","4.2"],"padilla":["1.1","1.2","2.1","2.2","3.1","3.2","4.1","4.2"]}}]}'::jsonb,
  '2026-05-19T04:32:30.875Z'
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "schema" = EXCLUDED."schema";

INSERT INTO "CredentialType" ("id", "code", "name", "description", "schema", "createdAt")
VALUES (
  'cmq66q4h30001ud1fhij0hcmz',
  'civil',
  'Personal Civil',
  'Credencial para personal civil',
  '{"fields":[{"name":"department","type":"text","label":"Dependencia","required":true,"maxLength":120},{"name":"position","type":"text","label":"Cargo","required":false,"maxLength":120}]}'::jsonb,
  '2026-06-09T05:14:04.455Z'
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "schema" = EXCLUDED."schema";

INSERT INTO "CredentialType" ("id", "code", "name", "description", "schema", "createdAt")
VALUES (
  'cmpn5augx000b10fkzpk3cbx9',
  'militar',
  'Militar',
  'Credencial para personal militar',
  '{"fields":[{"name":"force","type":"select","label":"Fuerza","options":["armada","ejercito","fuerza_aerea"],"required":true,"optionLabels":{"armada":"Armada","ejercito":"Ejército","fuerza_aerea":"Fuerza Aérea"}},{"name":"category","type":"select","label":"Categoría","required":true,"dependsOn":"force","optionLabels":{"IMP":"Infante de marina profesional","OfficerAir":"Oficial","ArmyOfficer":"Oficial","SubofficerAir":"Suboficial","ArmySubofficer":"Suboficial"},"optionsByParent":{"ejercito":["ArmyOfficer","ArmySubofficer","IMP"],"fuerza_aerea":["OfficerAir","SubofficerAir","IMP"]},"optionGroupsByParent":{"armada":[{"name":"Oficiales","options":[{"label":"Oficial Naval","value":"OfficerNavy"},{"label":"Oficial de Infanteria","value":"OfficerIM"}]},{"name":"Suboficiales","options":[{"label":"Suboficial Naval","value":"SubofficerNavy"},{"label":"Suboficial de Infanteria","value":"SubofficerIM"}]},{"name":"IMP","options":[{"label":"Infante de marina profesional","value":"IMP"}]}]}},{"name":"grades","type":"select","label":"Grado","required":true,"dependsOn":"category","hiddenWhen":{"field":"category","values":["IMP"]},"optionLabels":{"Mayor":"Mayor (MY)","Capitan":"Capitan (CT)","General":"General (GRCIM)","Teniente":"Teniente (TE)","Almirante":"Almirante (ALM)","Subteniente":"Subteniente (STCIM / ST)","Aerotécnico":"Aerotécnico (AT)","Cabo Primero":"Cabo Primero (CP)","Cabo Segundo":"Cabo Segundo (CS)","Cabo tercero":"Cabo tercero (C3)","Mayor General":"Mayor General (MGCIM / MG)","Técnico jefe":"Técnico jefe (TJ)","Vicealmirante":"Vicealmirante (VA)","Contralmirante":"Contralmirante (CA)","Sargento Mayor":"Sargento Mayor (SM)","Suboficial jefe":"Suboficial jefe (SJ)","Técnico Cuarto":"Técnico Cuarto (T4)","General del Aire":"General del Aire (GR)","Marinero Primero":"Marinero Primero (MA1)","Marinero Segundo":"Marinero Segundo (MA2)","Sargento Segundo":"Sargento Segundo (SS)","Sargento primero":"Sargento primero (SP)","Teniente coronel":"Teniente coronel (TCCIM / TC)","Técnico Primero":"Técnico Primero (T1)","Técnico Segundo":"Técnico Segundo (T2)","Técnico Subjefe":"Técnico Subjefe (TS)","Técnico Tercero":"Técnico Tercero (T3)","Brigadier General":"Brigadier General (BGCIM / BG)","Capitan de navío":"Capitan de navío (CN)","Teniente de Navio":"Teniente de Navio (TN)","Teniente efectivo":"Teniente efectivo (TECIM)","Capitan de corbeta":"Capitan de corbeta (CC)","Capitan de fragata":"Capitan de fragata (CF)","Suboficial Primero":"Suboficial Primero (S1)","Suboficial Segundo":"Suboficial Segundo (S2)","Suboficial Tercero":"Suboficial Tercero (S3)","Teniente de Fragata":"Teniente de Fragata (TF)","Teniente de corbeta":"Teniente de corbeta (TK)","General de ejército":"General de ejército (GDE)","Sargento Viceprimero":"Sargento Viceprimero (SV)","Capitan de infantería":"Capitan de infantería (CTCIM / CT)","Coronel de infantería":"Coronel de infantería (CRCIM / CR)","Suboficial jefe Técnico":"Suboficial jefe Técnico (SJT)","Técnico jefe de comando":"Técnico jefe de comando (TJC)","Sargento mayor de comando":"Sargento mayor de comando (SMC)","Mayor de infantería de marina":"Mayor de infantería de marina (MYCIM)","Sargento Mayor de Comando Conjunto":"Sargento Mayor de Comando Conjunto (SMC)","Suboficial jefe técnico de comando":"Suboficial jefe técnico de comando (SJTC)","Suboficial jefe Técnico de Comando Conjunto":"Suboficial jefe Técnico de Comando Conjunto (SJTCC)"},"autoValueWhen":{"field":"category","values":{"IMP":"Infante de marina profesional"}},"optionsByParent":{"OfficerIM":["Subteniente","Teniente efectivo","Capitan de infantería","Mayor de infantería de marina","Teniente coronel","Coronel de infantería","Brigadier General","Mayor General","General"],"OfficerAir":["Subteniente","Teniente","Capitan de infantería","Mayor","Teniente coronel","Coronel de infantería","Brigadier General","Mayor General","General del Aire"],"ArmyOfficer":["Subteniente","Teniente","Capitan","Mayor","Teniente coronel","Coronel de infantería","Brigadier General","Mayor General","General de ejército"],"OfficerNavy":["Teniente de corbeta","Teniente de Fragata","Teniente de Navio","Capitan de corbeta","Capitan de fragata","Capitan de navío","Contralmirante","Vicealmirante","Almirante"],"SubofficerIM":["Cabo tercero","Cabo Segundo","Cabo Primero","Sargento Segundo","Sargento Viceprimero","Sargento primero","Sargento Mayor","Sargento mayor de comando","Sargento Mayor de Comando Conjunto"],"SubofficerAir":["Aerotécnico","Técnico Cuarto","Técnico Tercero","Técnico Segundo","Técnico Primero","Técnico Subjefe","Técnico jefe","Técnico jefe de comando"],"ArmySubofficer":["Cabo tercero","Cabo Segundo","Cabo Primero","Sargento Segundo","Sargento Viceprimero","Sargento primero","Sargento Mayor","Sargento mayor de comando","Sargento Mayor de Comando Conjunto"],"SubofficerNavy":["Marinero Segundo","Marinero Primero","Suboficial Tercero","Suboficial Segundo","Suboficial Primero","Suboficial jefe","Suboficial jefe Técnico","Suboficial jefe técnico de comando","Suboficial jefe Técnico de Comando Conjunto"]}},{"name":"unit","type":"text","label":"Unidad","required":false,"maxLength":120}]}'::jsonb,
  '2026-05-26T21:26:34.679Z'
)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "schema" = EXCLUDED."schema";

