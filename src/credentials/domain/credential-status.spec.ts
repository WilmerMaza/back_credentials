import {
  CREDENTIAL_STATUSES,
  DEFAULT_CREDENTIAL_STATUS,
  mapStatusToDbValues,
  normalizeCredentialStatus,
} from "./credential-status";

describe("normalizeCredentialStatus", () => {
  it("usa PENDING por defecto al crear", () => {
    expect(normalizeCredentialStatus(undefined, DEFAULT_CREDENTIAL_STATUS)).toBe(
      "PENDING",
    );
  });

  it("normaliza alias en español", () => {
    expect(normalizeCredentialStatus("pendiente")).toBe("PENDING");
    expect(normalizeCredentialStatus("ACTIVO")).toBe("ACTIVE");
    expect(normalizeCredentialStatus("trasladado")).toBe("TRANSFERRED");
  });

  it("conserva códigos canónicos", () => {
    for (const status of CREDENTIAL_STATUSES) {
      expect(normalizeCredentialStatus(status)).toBe(status);
    }
  });

  it("rechaza estados desconocidos", () => {
    expect(() => normalizeCredentialStatus("INVALIDO")).toThrow(
      /Estado de credencial inválido/,
    );
  });
});

describe("mapStatusToDbValues", () => {
  it("mapea alias del front a valores del enum Prisma", () => {
    expect(mapStatusToDbValues("ACTIVO")).toEqual(["ACTIVE"]);
    expect(mapStatusToDbValues("EXPIRED")).toEqual(["EXPIRED"]);
    expect(mapStatusToDbValues("INACTIVO")).toEqual(["EXPIRED"]);
    expect(mapStatusToDbValues("PENDIENTE")).toEqual(["PENDING"]);
  });
});
