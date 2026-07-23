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
  alumnosBaenaCredentialTypeSchema,
  militarCredentialTypeSchema,
} from "../src/credentials/domain/credential-type-schemas";

const prisma = new PrismaClient();

const credentialTypes = [
  {
    code: "militar",
    name: "PERSONAL MILITAR",
    description: "Credencial para personal militar",
    schema: militarCredentialTypeSchema,
  },
  {
    code: "civil",
    name: "PERSONAL CIVIL",
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
    code: "alumnos_baena",
    name: "ALUMNOS BAENA",
    description: "Credencial para alumnos BAENA",
    schema: alumnosBaenaCredentialTypeSchema,
  },
];

async function main() {
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
