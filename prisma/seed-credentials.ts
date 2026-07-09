import { PrismaClient, CredentialStatus } from '@prisma/client';

const prisma = new PrismaClient();

const FIRST_NAMES = [
  'Carlos', 'María', 'Juan', 'Ana', 'Luis', 'Laura', 'Andrés', 'Diana',
  'Santiago', 'Valentina', 'Felipe', 'Camila', 'Diego', 'Natalia', 'Jorge',
];

const LAST_NAMES = [
  'García', 'Rodríguez', 'Martínez', 'López', 'Hernández', 'Pérez',
  'Gómez', 'Ramírez', 'Torres', 'Vargas', 'Castro', 'Rojas', 'Mendoza',
];

const MILITAR_METADATA = [
  {
    force: 'ejercito',
    category: 'ArmyOfficer',
    grades: 'Capitan',
    unit: 'Batallón de Infantería de Marina No. 5',
  },
  {
    force: 'armada',
    category: 'OfficerNavy',
    grades: 'Teniente',
    unit: 'Base Naval ARC Bolívar',
  },
  {
    force: 'fuerza_aerea',
    category: 'OfficerAir',
    grades: 'Mayor',
    unit: 'Grupo Aéreo del Caribe',
  },
  {
    force: 'ejercito',
    category: 'ArmySubofficer',
    grades: 'Sargento primero',
    unit: 'Brigada de Apoyo Logístico',
  },
];

const CIVIL_METADATA = [
  { department: 'Recursos Humanos', position: 'Analista administrativo' },
  { department: 'Tecnología', position: 'Desarrollador de software' },
  { department: 'Bienestar', position: 'Psicóloga organizacional' },
];

const ALUMNOS_METADATA = [
  { grado: 'cadete', compania: 'padilla', curso: '2.1' },
  { grado: 'cadete', compania: 'binney', curso: '3.2' },
  { grado: 'guardiamarina', compania: 'brion', curso: '4.1' },
  { grado: 'alferez', compania: 'tono', curso: '4.2' },
];

const STATUSES: CredentialStatus[] = [
  CredentialStatus.ACTIVE,
  CredentialStatus.ACTIVE,
  CredentialStatus.ACTIVE,
  CredentialStatus.PENDING,
  CredentialStatus.EXPIRED,
];

type SeedType = {
  code: string;
  metadataPool: Record<string, string>[];
};

function parseCountArg(): number {
  const args = process.argv.slice(2);
  const countArg = args.find((arg) => !arg.startsWith('--'));
  const parsed = parseInt(countArg ?? '10', 10);
  return Number.isNaN(parsed) || parsed < 1 ? 10 : Math.min(parsed, 500);
}

function shouldClear(): boolean {
  return process.argv.includes('--clear');
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomBirthDate(): Date {
  const year = 1985 + Math.floor(Math.random() * 20);
  const month = Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return new Date(year, month, day);
}

function randomIdentityNumber(index: number): string {
  const base = String(1_000_000_000 + index * 17_371 + Math.floor(Math.random() * 999));
  return base.slice(0, 10);
}

function addYears(date: Date, years: number): Date {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

async function loadSeedTypes(): Promise<SeedType[]> {
  const codes = ['militar', 'civil', 'alumnos_baena'] as const;
  const types: SeedType[] = [];

  for (const code of codes) {
    const credentialType = await prisma.credentialType.findUnique({ where: { code } });
    if (!credentialType) {
      console.warn(`Tipo "${code}" no encontrado. Ejecute: npm run seed:credential-types`);
      continue;
    }

    const metadataPool =
      code === 'militar'
        ? MILITAR_METADATA
        : code === 'civil'
          ? CIVIL_METADATA
          : ALUMNOS_METADATA;

    types.push({ code, metadataPool });
  }

  if (types.length === 0) {
    throw new Error(
      'No hay tipos de credencial en la BD. Ejecute primero: npm run seed:credential-types',
    );
  }

  return types;
}

async function clearSeededCredentials(): Promise<void> {
  const deleted = await prisma.credential.deleteMany({
    where: {
      person: {
        institutionalEmail: { endsWith: '@seed.enap.test' },
      },
    },
  });

  const deletedPeople = await prisma.person.deleteMany({
    where: {
      institutionalEmail: { endsWith: '@seed.enap.test' },
    },
  });

  console.log(
    `Limpieza: ${deleted.count} credencial(es) y ${deletedPeople.count} persona(s) de prueba eliminadas.`,
  );
}

async function main() {
  const totalToSeed = parseCountArg();
  const seedTypes = await loadSeedTypes();

  if (shouldClear()) {
    await clearSeededCredentials();
  }

  console.log(`Generando ${totalToSeed} credencial(es) de prueba...`);

  const typeByCode = new Map(
    (
      await prisma.credentialType.findMany({
        where: { code: { in: seedTypes.map((t) => t.code) } },
      })
    ).map((type) => [type.code, type]),
  );

  const issueDate = new Date();

  for (let i = 0; i < totalToSeed; i++) {
    const seedType = pick(seedTypes);
    const credentialType = typeByCode.get(seedType.code);
    if (!credentialType) continue;

    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const identityNumber = randomIdentityNumber(i + 1);
    const email = `${slugify(firstName)}.${slugify(lastName)}${i + 1}@seed.enap.test`;
    const status = pick(STATUSES);
    const expirationDate =
      status === CredentialStatus.EXPIRED
        ? addYears(issueDate, -1)
        : addYears(issueDate, 1);

    const person = await prisma.person.create({
      data: {
        firstName,
        lastName,
        fullName,
        typeIdentity: 'CC',
        identityNumber,
        birthDate: randomBirthDate(),
        institutionalEmail: email,
      },
    });

    const credential = await prisma.credential.create({
      data: {
        personId: person.id,
        credentialTypeId: credentialType.id,
        metadata: {
          ...pick(seedType.metadataPool),
          phone: `3${String(1_000_000_000 + i).slice(0, 9)}`,
        },
        imagePath: null,
        issueDate,
        expirationDate,
        status,
      },
    });

    console.log(
      `[${i + 1}/${totalToSeed}] ${credential.id} | ${fullName} | ${seedType.code} | ${status}`,
    );
  }

  console.log(`Listo: ${totalToSeed} credencial(es) de prueba creadas sin foto (usa imagen por defecto en UI).`);
}

main()
  .catch((error) => {
    console.error('Error seeding credentials:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
