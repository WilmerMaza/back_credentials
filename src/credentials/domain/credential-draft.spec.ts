import { BadRequestException } from "@nestjs/common";
import {
  assertCompleteCredentialSubmission,
  emptyToUndefined,
  isCompleteCredentialSubmission,
  resolveIsDraft,
} from "./credential-draft";

describe("credential draft helpers", () => {
  it("trata PENDING y ausencia de status como borrador", () => {
    expect(resolveIsDraft(undefined)).toBe(true);
    expect(resolveIsDraft("PENDING")).toBe(true);
    expect(resolveIsDraft("pendiente")).toBe(true);
    expect(resolveIsDraft("ACTIVE")).toBe(false);
  });

  it("normaliza strings vacíos a undefined", () => {
    expect(emptyToUndefined("")).toBeUndefined();
    expect(emptyToUndefined("  ")).toBeUndefined();
    expect(emptyToUndefined("a@b.co")).toBe("a@b.co");
  });

  it("detecta envío completo", () => {
    expect(
      isCompleteCredentialSubmission(
        {
          firstName: "Juan",
          lastName: "Pérez",
          identityNumber: "123",
          typeIdentity: "CC",
          birthDate: "1990-01-01",
          institutionalEmail: "a@b.co",
          credentialTypeCode: "militar",
        },
        { requireImage: true, hasImage: true },
      ),
    ).toBe(true);
  });

  it("detecta envío incompleto", () => {
    expect(
      isCompleteCredentialSubmission(
        { credentialTypeCode: "militar" },
        { requireImage: true, hasImage: false },
      ),
    ).toBe(false);
  });

  it("rechaza identidad y fecha placeholder al activar", () => {
    expect(
      isCompleteCredentialSubmission(
        {
          firstName: "Juan",
          lastName: "Pérez",
          identityNumber: "DRAFT-abc",
          typeIdentity: "CC",
          birthDate: "1970-01-01",
          institutionalEmail: "a@b.co",
          credentialTypeCode: "militar",
        },
        { requireImage: true, hasImage: true },
      ),
    ).toBe(false);
  });

  it("exige campos completos al activar credencial", () => {
    expect(() =>
      assertCompleteCredentialSubmission(
        { status: "ACTIVE" },
        { requireImage: true, hasImage: false },
      ),
    ).toThrow(BadRequestException);
  });
});
