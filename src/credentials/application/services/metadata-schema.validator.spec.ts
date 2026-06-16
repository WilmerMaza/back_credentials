import { BadRequestException } from "@nestjs/common";
import {
  cadetesCredentialTypeSchema,
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

  const cadetesSchema = cadetesCredentialTypeSchema;

  it("valida oficial naval con cascada force → category → grades", () => {
    const result = validator.validate(militarSchema, {
      force: "armada",
      category: "OfficerNavy",
      grades: "Teniente de Corbeta",
      unit: "Fragata ARC Caldas",
    });

    expect(result).toEqual({
      force: "armada",
      category: "OfficerNavy",
      grades: "Teniente de Corbeta",
      unit: "Fragata ARC Caldas",
    });
  });

  it("auto-asigna grado IMP cuando category es IMP", () => {
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

  it("rechaza grado incorrecto para IMP", () => {
    expect(() =>
      validator.validate(militarSchema, {
        force: "ejercito",
        category: "IMP",
        grades: "Teniente de Corbeta",
      }),
    ).toThrow(BadRequestException);
  });

  it("rechaza categoría incoherente con la fuerza", () => {
    expect(() =>
      validator.validate(militarSchema, {
        force: "ejercito",
        category: "OfficerNavy",
        grades: "Teniente de Corbeta",
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
      rank: "Teniente de Corbeta",
    });

    expect(result).toEqual({
      force: "armada",
      category: "OfficerNavy",
      grades: "Teniente de Corbeta",
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

  it("auto-asigna compañía y curso cuando grado es aspirante", () => {
    const result = validator.validate(cadetesSchema, {
      grado: "aspirante",
      compania: "binney",
      curso: "1.1",
    });

    expect(result).toEqual({
      grado: "aspirante",
      compania: "binney",
      curso: "1.1",
    });
  });

  it("auto-asigna compañía y curso vacíos para aspirante", () => {
    const result = validator.validate(cadetesSchema, {
      grado: "aspirante",
    });

    expect(result).toEqual({
      grado: "aspirante",
      compania: "binney",
      curso: "1.1",
    });
  });

  it("valida cadete con selección manual de compañía y curso", () => {
    const result = validator.validate(cadetesSchema, {
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

  it("rechaza compañía incorrecta para aspirante", () => {
    expect(() =>
      validator.validate(cadetesSchema, {
        grado: "aspirante",
        compania: "tono",
        curso: "1.1",
      }),
    ).toThrow(BadRequestException);
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
