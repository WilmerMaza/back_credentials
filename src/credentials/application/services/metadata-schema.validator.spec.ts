import { BadRequestException } from "@nestjs/common";
import {
  alumnosBaenaCredentialTypeSchema,
  militarCredentialTypeSchema,
} from "../../domain/credential-type-schemas";
import { CredentialTypeSchema } from "../../domain/credential-type-schema";
import {
  normalizeLegacyInput,
  normalizeLegacyOutput,
} from "./metadata-legacy.normalizer";
import { MetadataSchemaValidator } from "./metadata-schema.validator";

describe("MetadataSchemaValidator", () => {
  const validator = new MetadataSchemaValidator();
  const militarSchema = militarCredentialTypeSchema;

  const civilSchema: CredentialTypeSchema = {
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
  };

  const alumnosBaenaSchema = alumnosBaenaCredentialTypeSchema;

  it("valida oficial naval con cascada force → category → grades", () => {
    const result = validator.validate(militarSchema, {
      force: "armada",
      category: "OfficerNavy",
      grades: "Teniente de corbeta",
      unit: "Fragata ARC Caldas",
    });

    expect(result).toEqual({
      force: "armada",
      category: "OfficerNavy",
      grades: "Teniente de corbeta",
      unit: "Fragata ARC Caldas",
    });
  });

  it("valida Almirante en oficial naval", () => {
    const result = validator.validate(militarSchema, {
      force: "armada",
      category: "OfficerNavy",
      grades: "Almirante",
    });

    expect(result).toEqual({
      force: "armada",
      category: "OfficerNavy",
      grades: "Almirante",
    });
  });

  it("valida oficial de ejército con categoría y grado", () => {
    const result = validator.validate(militarSchema, {
      force: "ejercito",
      category: "ArmyOfficer",
      grades: "Mayor",
    });

    expect(result).toEqual({
      force: "ejercito",
      category: "ArmyOfficer",
      grades: "Mayor",
    });
  });

  it("valida suboficial de ejército con categoría y grado", () => {
    const result = validator.validate(militarSchema, {
      force: "ejercito",
      category: "ArmySubofficer",
      grades: "Sargento Mayor",
    });

    expect(result).toEqual({
      force: "ejercito",
      category: "ArmySubofficer",
      grades: "Sargento Mayor",
    });
  });

  it("normaliza category legacy Army según grado", () => {
    const result = validator.validate(militarSchema, {
      force: "ejercito",
      category: "Army",
      grades: "General de ejército",
    });

    expect(result).toEqual({
      force: "ejercito",
      category: "ArmyOfficer",
      grades: "General de ejército",
    });
  });

  it("valida técnico de fuerza aérea con categoría", () => {
    const result = validator.validate(militarSchema, {
      force: "fuerza_aerea",
      category: "SubofficerAir",
      grades: "Técnico Segundo",
    });

    expect(result).toEqual({
      force: "fuerza_aerea",
      category: "SubofficerAir",
      grades: "Técnico Segundo",
    });
  });

  it("valida oficial de fuerza aérea con categoría", () => {
    const result = validator.validate(militarSchema, {
      force: "fuerza_aerea",
      category: "OfficerAir",
      grades: "General del Aire",
    });

    expect(result).toEqual({
      force: "fuerza_aerea",
      category: "OfficerAir",
      grades: "General del Aire",
    });
  });

  it("normaliza category legacy AirForce según grado", () => {
    const result = validator.validate(militarSchema, {
      force: "fuerza_aerea",
      category: "AirForce",
      grades: "Técnico jefe de comando",
    });

    expect(result).toEqual({
      force: "fuerza_aerea",
      category: "SubofficerAir",
      grades: "Técnico jefe de comando",
    });
  });

  it("valida suboficial IM con grado de comando conjunto", () => {
    const result = validator.validate(militarSchema, {
      force: "armada",
      category: "SubofficerIM",
      grades: "Sargento Mayor de Comando Conjunto",
    });

    expect(result).toEqual({
      force: "armada",
      category: "SubofficerIM",
      grades: "Sargento Mayor de Comando Conjunto",
    });
  });

  it("auto-asigna grado IMP cuando category es IMP en ejército", () => {
    const result = validator.validate(militarSchema, {
      force: "ejercito",
      category: "IMP",
      grades: "Infante de marina profesional",
    });

    expect(result).toEqual({
      force: "ejercito",
      category: "IMP",
      grades: "Infante de marina profesional",
    });
  });

  it("auto-asigna grado IMP cuando category es IMP en armada", () => {
    const result = validator.validate(militarSchema, {
      force: "armada",
      category: "IMP",
      grades: "Infante de marina profesional",
    });

    expect(result).toEqual({
      force: "armada",
      category: "IMP",
      grades: "Infante de marina profesional",
    });
  });

  it("rechaza grado incorrecto para IMP", () => {
    expect(() =>
      validator.validate(militarSchema, {
        force: "armada",
        category: "IMP",
        grades: "Teniente de corbeta",
      }),
    ).toThrow(BadRequestException);
  });

  it("rechaza categoría incoherente con la fuerza", () => {
    expect(() =>
      validator.validate(militarSchema, {
        force: "ejercito",
        category: "OfficerNavy",
        grades: "Mayor",
      }),
    ).toThrow(BadRequestException);
  });

  it("rechaza grado fuera del catálogo", () => {
    expect(() =>
      validator.validate(militarSchema, {
        force: "armada",
        category: "OfficerNavy",
        grades: "Grado inventado",
      }),
    ).toThrow(BadRequestException);
  });

  it("normaliza legacy categorie y rank en escritura", () => {
    const result = validator.validate(militarSchema, {
      force: "armada",
      categorie: "OfficerNavy",
      rank: "Teniente de corbeta",
    });

    expect(result).toEqual({
      force: "armada",
      category: "OfficerNavy",
      grades: "Teniente de corbeta",
    });
  });

  it("mantiene civil sin regresión", () => {
    const result = validator.validate(civilSchema, {
      department: "Logística",
      position: "Analista",
    });

    expect(result).toEqual({
      department: "Logística",
      position: "Analista",
    });
  });

  it("valida cadete con compañía y curso", () => {
    const result = validator.validate(alumnosBaenaSchema, {
      grado: "cadete",
      compania: "tono",
      curso: "2.2",
    });

    expect(result).toEqual({
      grado: "cadete",
      compania: "tono",
      curso: "2.2",
    });
  });

  it("valida alférez con compañía y curso", () => {
    const result = validator.validate(alumnosBaenaSchema, {
      grado: "alferez",
      compania: "padilla",
      curso: "4.1",
    });

    expect(result).toEqual({
      grado: "alferez",
      compania: "padilla",
      curso: "4.1",
    });
  });

  it("rechaza grado aspirante fuera del catálogo BAENA", () => {
    expect(() =>
      validator.validate(alumnosBaenaSchema, {
        grado: "aspirante",
        compania: "binney",
        curso: "1.1",
      }),
    ).toThrow(BadRequestException);
  });

  it("valida guardiamarina con compañía y curso", () => {
    const result = validator.validate(alumnosBaenaSchema, {
      grado: "guardiamarina",
      compania: "brion",
      curso: "3.1",
    });

    expect(result).toEqual({
      grado: "guardiamarina",
      compania: "brion",
      curso: "3.1",
    });
  });

  it("rechaza compañía sin grado seleccionado", () => {
    expect(() =>
      validator.validate(alumnosBaenaSchema, {
        compania: "binney",
        curso: "1.1",
      }),
    ).toThrow(BadRequestException);
  });

  it("rechaza curso sin compañía seleccionada", () => {
    expect(() =>
      validator.validate(alumnosBaenaSchema, {
        grado: "cadete",
        curso: "1.1",
      }),
    ).toThrow(BadRequestException);
  });

  it("rechaza compañía fuera del catálogo", () => {
    expect(() =>
      validator.validate(alumnosBaenaSchema, {
        compania: "invalida",
        grado: "cadete",
        curso: "1.1",
      }),
    ).toThrow(BadRequestException);
  });

  it("no exige campos requeridos en borrador (allowPartial)", () => {
    const result = validator.validate(
      militarSchema,
      { force: "armada" },
      { allowPartial: true },
    );

    expect(result).toEqual({ force: "armada" });
  });
});

describe("metadata legacy normalizer", () => {
  it("mapea alias legacy en input", () => {
    expect(
      normalizeLegacyInput({
        categorie: "IMP",
        rank: "Infante de marina profesional",
      }),
    ).toEqual({
      category: "IMP",
      grades: "Infante de marina profesional",
    });
  });

  it("mapea category legacy Army a ArmyOfficer por grado", () => {
    expect(
      normalizeLegacyInput({
        category: "Army",
        grades: "Mayor",
      }),
    ).toEqual({
      category: "ArmyOfficer",
      grades: "Mayor",
    });
  });

  it("mapea category legacy AirForce a SubofficerAir por grado", () => {
    expect(
      normalizeLegacyInput({
        category: "AirForce",
        grades: "Técnico Segundo",
      }),
    ).toEqual({
      category: "SubofficerAir",
      grades: "Técnico Segundo",
    });
  });

  it("elimina alias legacy en output", () => {
    expect(
      normalizeLegacyOutput({
        category: "IMP",
        grades: "Infante de marina profesional",
        rank: "legacy",
      }),
    ).toEqual({
      category: "IMP",
      grades: "Infante de marina profesional",
    });
  });
});
