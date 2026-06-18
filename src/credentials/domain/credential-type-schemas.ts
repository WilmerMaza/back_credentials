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
    // - Armada: optionGroupsByParent (3 grupos con optgroups)
    // - Ejército / Fuerza Aérea: optionsByParent plano
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
          "Teniente de Corbeta",
          "Teniente de Fragata",
          "Teniente de Navio",
          "Capitan de Corbeta",
          "Capitan de Fragata",
          "Capitan de Navio",
          "Contralmirante",
          "Vicealmirante",
        ],
        OfficerIM: [
          "Subteniente",
          "Teniente Efectivo",
          "Capitan de Infanteria de Marina",
          "Mayor de Infanteria de Marina",
          "Teniente Coronel",
          "Coronel de Infanteria de Marina",
          "Brigadier General",
        ],
        SubofficerNavy: [
          "Marinero Segundo",
          "Marinero Primero",
          "Suboficial Tercero",
          "Suboficial Segundo",
          "Suboficial Primero",
          "Suboficial Jefe",
          "Suboficial Jefe Tecnico",
        ],
        SubofficerIM: [
          "Cabo Tercero",
          "Cabo Segundo",
          "Cabo Primero",
          "Sargento Segundo",
          "Sargento Viceprimer",
          "Sargento Primero",
          "Sargento Mayor",
        ],
        ArmyOfficer: [
          "Subteniente",
          "Teniente Efectivo",
          "Capitan de Infanteria de Marina",
          "Mayor de Infanteria de Marina",
          "Teniente Coronel",
          "Coronel de Infanteria de Marina",
          "Brigadier General",
        ],
        ArmySubofficer: [
          "Cabo Tercero",
          "Cabo Segundo",
          "Cabo Primero",
          "Sargento Segundo",
          "Sargento Viceprimer",
          "Sargento Primero",
          "Sargento Mayor",
        ],
        OfficerAir: [
          "Teniente de Corbeta",
          "Teniente de Fragata",
          "Teniente de Navio",
          "Capitan de Corbeta",
          "Capitan de Fragata",
          "Capitan de Navio",
          "Contralmirante",
          "Vicealmirante",
        ],
        SubofficerAir: [
          "Marinero Segundo",
          "Marinero Primero",
          "Suboficial Tercero",
          "Suboficial Segundo",
          "Suboficial Primero",
          "Suboficial Jefe",
          "Suboficial Jefe Tecnico",
        ],
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
 * Cadetes (antes inter-escuelas).
 *
 * Jerarquía lógica: grado → compañía → curso
 * (grado va primero en fields porque compañía/curso dependen de la regla Aspirante)
 *
 * Regla Aspirante:
 *   defaultValueWhen + autoValueWhen → sugerir y persistir Binney / 1.1.
 */
export const cadetesCredentialTypeSchema: CredentialTypeSchema = {
  fields: [
    {
      name: "grado",
      label: "Grado",
      type: "select",
      required: true,
      options: ["aspirante", "cadete", "guardiamarina", "alferez"],
      optionLabels: {
        aspirante: "Aspirante",
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
      options: ["binney", "tono", "brion", "padilla"],
      optionLabels: {
        binney: "Binney",
        tono: "Tono",
        brion: "Brion",
        padilla: "Padilla",
      },
      autoValueWhen: {
        field: "grado",
        values: {
          aspirante: "binney",
        },
      },
      defaultValueWhen: {
        field: "grado",
        values: {
          aspirante: "binney",
        },
      },
    },
    {
      name: "curso",
      label: "Curso",
      type: "select",
      required: true,
      options: ["1.1", "1.2", "2.1", "2.2", "3.1", "3.2", "4.1", "4.2"],
      autoValueWhen: {
        field: "grado",
        values: {
          aspirante: "1.1",
        },
      },
      defaultValueWhen: {
        field: "grado",
        values: {
          aspirante: "1.1",
        },
      },
    },
  ],
};
