-- Agregar nombre y apellido separados
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Migrar fullName existente: primera palabra -> firstName, resto -> lastName
UPDATE "Person"
SET
  "firstName" = COALESCE(
    NULLIF(TRIM(SPLIT_PART(TRIM("fullName"), ' ', 1)), ''),
    TRIM("fullName")
  ),
  "lastName" = COALESCE(
    NULLIF(
      TRIM(
        SUBSTRING(
          TRIM("fullName")
          FROM LENGTH(SPLIT_PART(TRIM("fullName"), ' ', 1)) + 2
        )
      ),
      ''
    ),
    ''
  )
WHERE "firstName" IS NULL OR "lastName" IS NULL;

UPDATE "Person"
SET
  "firstName" = COALESCE("firstName", ''),
  "lastName" = COALESCE("lastName", '')
WHERE "firstName" IS NULL OR "lastName" IS NULL;

ALTER TABLE "Person" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Person" ALTER COLUMN "lastName" SET NOT NULL;
