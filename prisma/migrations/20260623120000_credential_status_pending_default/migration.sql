-- Default al crear: PENDING (antes ACTIVE)
ALTER TABLE "Credential" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Estado usado por el frontend para traslados
ALTER TYPE "CredentialStatus" ADD VALUE IF NOT EXISTS 'TRANSFERRED';
