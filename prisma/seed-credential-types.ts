import { Prisma, PrismaClient } from "@prisma/client";
/**
 * Seed de tipos de credencial.
 *
 * Los schemas viven en src/credentials/domain/credential-type-schemas.ts
 * con comentarios por campo. Ver docs/CREDENTIALS_METADATA.md.
 *
 * Ejecutar: npm run seed:credential-types
 */
import {
  cadetesCredentialTypeSchema,
  militarCredentialTypeSchema,
} from "../src/credentials/domain/credential-type-schemas";

const prisma = new PrismaClient();

const credentialTypes = [
  {
    code: "militar",
    name: "Militar",
    description: "Credencial para personal militar",
    schema: militarCredentialTypeSchema,
  },
  {
    code: "civil",
    name: "Personal Civil",
    description: "Credencial para personal civil",
    schema: {
      fields: [
        {
          name: "department",
          label: "Dependencia",
          type: "text",
          required: true,
          maxLength: 120,
        },
        {
          name: "position",
          label: "Cargo",
          type: "text",
          required: false,
          maxLength: 120,
        },
      ],
    },
  },
  {
    code: "cadetes",
    name: "Cadetes",
    description: "Credencial para cadetes",
    schema: cadetesCredentialTypeSchema,
  },
];

async function migrateInterEscuelasToCadetes(): Promise<void> {
  const legacy = await prisma.credentialType.findUnique({
    where: { code: "inter-escuelas" },
  });

  if (!legacy) {
    return;
  }

  const existingCadetes = await prisma.credentialType.findUnique({
    where: { code: "cadetes" },
  });

  if (existingCadetes) {
    await prisma.credential.updateMany({
      where: { credentialTypeId: legacy.id },
      data: { credentialTypeId: existingCadetes.id },
    });
    await prisma.credentialType.delete({ where: { id: legacy.id } });
    console.log(
      "Merged credentials from inter-escuelas into existing cadetes type",
    );
    return;
  }

  await prisma.credentialType.update({
    where: { id: legacy.id },
    data: {
      code: "cadetes",
      name: "Cadetes",
      description: "Credencial para cadetes",
      schema: cadetesCredentialTypeSchema as unknown as Prisma.InputJsonValue,
    },
  });
  console.log(
    "Migrated inter-escuelas → cadetes (same type id, credentials unchanged)",
  );
}

async function main() {
  await migrateInterEscuelasToCadetes();

  for (const type of credentialTypes) {
    await prisma.credentialType.upsert({
      where: { code: type.code },
      update: {
        name: type.name,
        description: type.description,
        schema: type.schema as Prisma.InputJsonValue,
      },
      create: {
        ...type,
        schema: type.schema as Prisma.InputJsonValue,
      },
    });

    console.log(`Credential type ready: ${type.code}`);
  }
}

main()
  .catch((error) => {
    console.error("Error seeding credential types:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
