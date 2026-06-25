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
    code: "alumnos_baena",
    name: "Alumnos BAENA",
    description: "Credencial para alumnos BAENA",
    schema: alumnosBaenaCredentialTypeSchema,
  },
];

async function retireInterEscuelasTypes(): Promise<void> {
  const alumnosBaena = await prisma.credentialType.findUnique({
    where: { code: "alumnos_baena" },
  });

  if (!alumnosBaena) {
    return;
  }

  for (const code of ["inter_escuelas", "inter-escuelas"]) {
    const legacy = await prisma.credentialType.findUnique({
      where: { code },
    });

    if (!legacy) {
      continue;
    }

    const moved = await prisma.credential.updateMany({
      where: { credentialTypeId: legacy.id },
      data: { credentialTypeId: alumnosBaena.id },
    });

    await prisma.credentialType.delete({ where: { id: legacy.id } });
    console.log(
      `Retired ${code}: ${moved.count} credential(s) moved to alumnos_baena`,
    );
  }
}

async function migrateCadetesToAlumnosBaena(): Promise<void> {
  const cadetes = await prisma.credentialType.findUnique({
    where: { code: "cadetes" },
  });

  if (!cadetes) {
    return;
  }

  const existingAlumnosBaena = await prisma.credentialType.findUnique({
    where: { code: "alumnos_baena" },
  });

  if (existingAlumnosBaena) {
    await prisma.credential.updateMany({
      where: { credentialTypeId: cadetes.id },
      data: { credentialTypeId: existingAlumnosBaena.id },
    });
    await prisma.credentialType.delete({ where: { id: cadetes.id } });
    console.log(
      "Merged credentials from cadetes into existing alumnos_baena type",
    );
    return;
  }

  await prisma.credentialType.update({
    where: { id: cadetes.id },
    data: {
      code: "alumnos_baena",
      name: "Alumnos BAENA",
      description: "Credencial para alumnos BAENA",
      schema: alumnosBaenaCredentialTypeSchema as unknown as Prisma.InputJsonValue,
    },
  });
  console.log(
    "Migrated cadetes → alumnos_baena (same type id, credentials unchanged)",
  );
}

async function main() {
  await retireInterEscuelasTypes();
  await migrateCadetesToAlumnosBaena();

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
