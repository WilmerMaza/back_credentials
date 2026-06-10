import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const credentialTypes = [
  {
    code: "militar",
    name: "Personal Militar",
    description: "Credencial para personal militar activo",
    schema: {
      fields: [
        {
          name: "force",
          label: "Fuerza",
          type: "select",
          required: true,
          options: ["armada", "ejercito", "fuerza_aerea"],
        },
        {
          name: "grades",
          label: "Rango",
          type: "text",
          required: true,
          minLength: 2,
          maxLength: 120,
        },
        {
          name: "unit",
          label: "Unidad",
          type: "text",
          required: false,
          maxLength: 120,
        },
      ],
    },
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
    code: "inter-escuelas",
    name: "Inter-escuelas",
    description: "Credencial deportiva inter-escuelas",
    schema: {
      fields: [
        {
          name: "force",
          label: "Fuerza",
          type: "select",
          required: true,
          options: [
            "armada",
            "ejercito",
            "fuerza_aerea",
            "policia_nacional",
          ],
        },
        {
          name: "sport",
          label: "Deporte",
          type: "text",
          required: true,
          minLength: 2,
          maxLength: 80,
        },
        {
          name: "course",
          label: "Curso / Año",
          type: "select",
          required: true,
          options: ["1", "2", "3", "4"],
        },
      ],
    },
  },
];

async function main() {
  for (const type of credentialTypes) {
    await prisma.credentialType.upsert({
      where: { code: type.code },
      update: {
        name: type.name,
        description: type.description,
        schema: type.schema,
      },
      create: type,
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
