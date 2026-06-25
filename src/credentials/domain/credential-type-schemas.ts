import { CredentialTypeSchema } from "./credential-type-schema";

/**
 * Catálogos de schema por tipo de credencial.
 *
 * Fuente de verdad para el seed (`npm run seed:credential-types`).
 * Tras editar, ejecutar el seed para actualizar CredentialType.schema en BD.
 *
 * Jerarquía militar:
 *   force → category → grades → unit
 *
 * Regla IMP:
 *   Si category = "IMP", grades no se selecciona (hiddenWhen)
 *   y se persiste "Infante de marina profesional" (autoValueWhen).
 */

const armyOfficerGrades = [
  "Subteniente",
  "Teniente",
  "Capitan",
  "Mayor",
  "Teniente coronel",
  "Coronel de infantería",
  "Brigadier General",
  "Mayor General",
  "General de ejército",
] as const;

const armySubofficerGrades = [
  "Cabo tercero",
  "Cabo Segundo",
  "Cabo Primero",
  "Sargento Segundo",
  "Sargento Viceprimero",
  "Sargento primero",
  "Sargento Mayor",
  "Sargento mayor de comando",
  "Sargento Mayor de Comando Conjunto",
] as const;

const airForceOfficerGrades = [
  "Subteniente",
  "Teniente",
  "Capitan de infantería",
  "Mayor",
  "Teniente coronel",
  "Coronel de infantería",
  "Brigadier General",
  "Mayor General",
  "General del Aire",
] as const;

const airForceSubofficerGrades = [
  "Aerotécnico",
  "Técnico Cuarto",
  "Técnico Tercero",
  "Técnico Segundo",
  "Técnico Primero",
  "Técnico Subjefe",
  "Técnico jefe",
  "Técnico jefe de comando",
] as const;

export const militarCredentialTypeSchema: CredentialTypeSchema = {
  fields: [
    // Nivel 1: fuerza (select raíz, sin dependsOn)
    {
      name: "force",
      label: "Fuerza",
      type: "select",
      required: true,
      options: ["armada", "ejercito", "fuerza_aerea"],
      optionLabels: {
        armada: "Armada",
        ejercito: "Ejército",
        fuerza_aerea: "Fuerza Aérea",
      },
    },

    // Nivel 2: categoría filtrada por force
    // - Armada: optionGroupsByParent (Oficiales / Suboficiales / IMP)
    // - Ejército / Fuerza Aérea: Oficial, Suboficial, IMP
    {
      name: "category",
      label: "Categoría",
      type: "select",
      required: true,
      dependsOn: "force",
      optionGroupsByParent: {
        armada: [
          {
            name: "Oficiales",
            options: [
              { value: "OfficerNavy", label: "Oficial Naval" },
              { value: "OfficerIM", label: "Oficial de Infanteria" },
            ],
          },
          {
            name: "Suboficiales",
            options: [
              { value: "SubofficerNavy", label: "Suboficial Naval" },
              { value: "SubofficerIM", label: "Suboficial de Infanteria" },
            ],
          },
          {
            name: "IMP",
            options: [
              { value: "IMP", label: "Infante de marina profesional" },
            ],
          },
        ],
      },
      optionsByParent: {
        ejercito: ["ArmyOfficer", "ArmySubofficer", "IMP"],
        fuerza_aerea: ["OfficerAir", "SubofficerAir", "IMP"],
      },
      optionLabels: {
        ArmyOfficer: "Oficial",
        ArmySubofficer: "Suboficial",
        OfficerAir: "Oficial",
        SubofficerAir: "Suboficial",
        IMP: "Infante de marina profesional",
      },
    },

    // Nivel 3: grado/rango filtrado por category (código de categoría)
    // hiddenWhen + autoValueWhen: IMP no selecciona grado manualmente
    {
      name: "grades",
      label: "Grado",
      type: "select",
      required: true,
      dependsOn: "category",
      optionsByParent: {
        OfficerNavy: [
          "Teniente de corbeta",
          "Teniente de Fragata",
          "Teniente de Navio",
          "Capitan de corbeta",
          "Capitan de fragata",
          "Capitan de navío",
          "Contralmirante",
          "Vicealmirante",
          "Almirante",
        ],
        OfficerIM: [
          "Subteniente",
          "Teniente efectivo",
          "Capitan de infantería",
          "Mayor de infantería de marina",
          "Teniente coronel",
          "Coronel de infantería",
          "Brigadier General",
          "Mayor General",
          "General",
        ],
        SubofficerNavy: [
          "Marinero Segundo",
          "Marinero Primero",
          "Suboficial Tercero",
          "Suboficial Segundo",
          "Suboficial Primero",
          "Suboficial jefe",
          "Suboficial jefe Técnico",
          "Suboficial jefe técnico de comando",
          "Suboficial jefe Técnico de Comando Conjunto",
        ],
        SubofficerIM: [
          "Cabo tercero",
          "Cabo Segundo",
          "Cabo Primero",
          "Sargento Segundo",
          "Sargento Viceprimero",
          "Sargento primero",
          "Sargento Mayor",
          "Sargento mayor de comando",
          "Sargento Mayor de Comando Conjunto",
        ],
        ArmyOfficer: [...armyOfficerGrades],
        ArmySubofficer: [...armySubofficerGrades],
        OfficerAir: [...airForceOfficerGrades],
        SubofficerAir: [...airForceSubofficerGrades],
      },
      optionLabels: {
        "Teniente de corbeta": "Teniente de corbeta (TK)",
        "Teniente de Fragata": "Teniente de Fragata (TF)",
        "Teniente de Navio": "Teniente de Navio (TN)",
        "Capitan de corbeta": "Capitan de corbeta (CC)",
        "Capitan de fragata": "Capitan de fragata (CF)",
        "Capitan de navío": "Capitan de navío (CN)",
        Contralmirante: "Contralmirante (CA)",
        Vicealmirante: "Vicealmirante (VA)",
        Almirante: "Almirante (ALM)",
        Subteniente: "Subteniente (STCIM / ST)",
        "Teniente efectivo": "Teniente efectivo (TECIM)",
        "Capitan de infantería": "Capitan de infantería (CTCIM / CT)",
        "Mayor de infantería de marina": "Mayor de infantería de marina (MYCIM)",
        "Teniente coronel": "Teniente coronel (TCCIM / TC)",
        "Coronel de infantería": "Coronel de infantería (CRCIM / CR)",
        "Brigadier General": "Brigadier General (BGCIM / BG)",
        "Mayor General": "Mayor General (MGCIM / MG)",
        General: "General (GRCIM)",
        "Marinero Segundo": "Marinero Segundo (MA2)",
        "Marinero Primero": "Marinero Primero (MA1)",
        "Suboficial Tercero": "Suboficial Tercero (S3)",
        "Suboficial Segundo": "Suboficial Segundo (S2)",
        "Suboficial Primero": "Suboficial Primero (S1)",
        "Suboficial jefe": "Suboficial jefe (SJ)",
        "Suboficial jefe Técnico": "Suboficial jefe Técnico (SJT)",
        "Suboficial jefe técnico de comando": "Suboficial jefe técnico de comando (SJTC)",
        "Suboficial jefe Técnico de Comando Conjunto":
          "Suboficial jefe Técnico de Comando Conjunto (SJTCC)",
        "Cabo tercero": "Cabo tercero (C3)",
        "Cabo Segundo": "Cabo Segundo (CS)",
        "Cabo Primero": "Cabo Primero (CP)",
        "Sargento Segundo": "Sargento Segundo (SS)",
        "Sargento Viceprimero": "Sargento Viceprimero (SV)",
        "Sargento primero": "Sargento primero (SP)",
        "Sargento Mayor": "Sargento Mayor (SM)",
        "Sargento mayor de comando": "Sargento mayor de comando (SMC)",
        "Sargento Mayor de Comando Conjunto":
          "Sargento Mayor de Comando Conjunto (SMC)",
        Teniente: "Teniente (TE)",
        Capitan: "Capitan (CT)",
        Mayor: "Mayor (MY)",
        "General de ejército": "General de ejército (GDE)",
        "General del Aire": "General del Aire (GR)",
        Aerotécnico: "Aerotécnico (AT)",
        "Técnico Cuarto": "Técnico Cuarto (T4)",
        "Técnico Tercero": "Técnico Tercero (T3)",
        "Técnico Segundo": "Técnico Segundo (T2)",
        "Técnico Primero": "Técnico Primero (T1)",
        "Técnico Subjefe": "Técnico Subjefe (TS)",
        "Técnico jefe": "Técnico jefe (TJ)",
        "Técnico jefe de comando": "Técnico jefe de comando (TJC)",
      },
      hiddenWhen: {
        field: "category",
        values: ["IMP"],
      },
      autoValueWhen: {
        field: "category",
        values: {
          IMP: "Infante de marina profesional",
        },
      },
    },

    // Campo libre opcional, sin cascada
    {
      name: "unit",
      label: "Unidad",
      type: "text",
      required: false,
      maxLength: 120,
    },
  ],
};

/**
 * Alumnos BAENA (antes cadetes).
 *
 * Cascada: grado → compañía → curso
 * (compañía y curso sin opciones hasta completar los campos obligatorios previos)
 */

const alumnosBaenaCompanias = ["binney", "tono", "brion", "padilla"] as const;

const alumnosBaenaCursos = [
  "1.1",
  "1.2",
  "2.1",
  "2.2",
  "3.1",
  "3.2",
  "4.1",
  "4.2",
] as const;

const alumnosBaenaCompaniasByGrado = {
  cadete: [...alumnosBaenaCompanias],
  guardiamarina: [...alumnosBaenaCompanias],
  alferez: [...alumnosBaenaCompanias],
};

const alumnosBaenaCursosByCompania = Object.fromEntries(
  alumnosBaenaCompanias.map((compania) => [compania, [...alumnosBaenaCursos]]),
) as Record<string, string[]>;

export const alumnosBaenaCredentialTypeSchema: CredentialTypeSchema = {
  fields: [
    {
      name: "grado",
      label: "Grado",
      type: "select",
      required: true,
      options: ["cadete", "guardiamarina", "alferez"],
      optionLabels: {
        cadete: "Cadete",
        guardiamarina: "Guardiamarina",
        alferez: "Alférez",
      },
    },
    {
      name: "compania",
      label: "Compañía",
      type: "select",
      required: true,
      dependsOn: "grado",
      optionsByParent: alumnosBaenaCompaniasByGrado,
      optionLabels: {
        binney: "Binney",
        tono: "Tono",
        brion: "Brion",
        padilla: "Padilla",
      },
    },
    {
      name: "curso",
      label: "Curso",
      type: "select",
      required: true,
      dependsOn: "compania",
      optionsByParent: alumnosBaenaCursosByCompania,
    },
  ],
};
