-- CredentialType: schema JSONB
ALTER TABLE "CredentialType" ADD COLUMN IF NOT EXISTS "schema" JSONB NOT NULL DEFAULT '{"fields":[]}';

-- Credential: metadata JSONB
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}';

-- Migrar columnas legacy a metadata
UPDATE "Credential"
SET "metadata" = "metadata" || jsonb_strip_nulls(
  jsonb_build_object(
    'rank', "rank",
    'unit', "unit",
    'force', "force",
    'sport', "sport",
    'course', "course",
    'grades', "grades"
  )
)
WHERE "rank" IS NOT NULL
   OR "unit" IS NOT NULL
   OR "force" IS NOT NULL
   OR "sport" IS NOT NULL
   OR "course" IS NOT NULL
   OR "grades" IS NOT NULL;

ALTER TABLE "Credential" DROP COLUMN IF EXISTS "rank";
ALTER TABLE "Credential" DROP COLUMN IF EXISTS "unit";
ALTER TABLE "Credential" DROP COLUMN IF EXISTS "force";
ALTER TABLE "Credential" DROP COLUMN IF EXISTS "sport";
ALTER TABLE "Credential" DROP COLUMN IF EXISTS "course";
ALTER TABLE "Credential" DROP COLUMN IF EXISTS "grades";
