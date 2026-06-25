import { normalizeCredentialFormFields } from "./credential-form-fields.normalizer";

describe("normalizeCredentialFormFields", () => {
  it("mapea alias tipoIdentidad y numeroIdentidad", () => {
    const result = normalizeCredentialFormFields({
      tipoIdentidad: "CC",
      numeroIdentidad: "123456789",
    });

    expect(result.typeIdentity).toBe("CC");
    expect(result.identityNumber).toBe("123456789");
  });

  it("extrae identidad desde details.common", () => {
    const result = normalizeCredentialFormFields({
      details: JSON.stringify({
        common: {
          tipoIdentidad: "CE",
          identityNumber: "999",
        },
      }),
    });

    expect(result.typeIdentity).toBe("CE");
    expect(result.identityNumber).toBe("999");
  });

  it("prioriza campos planos sobre details", () => {
    const result = normalizeCredentialFormFields({
      typeIdentity: "TI",
      details: JSON.stringify({ tipoIdentidad: "CC" }),
    });

    expect(result.typeIdentity).toBe("TI");
  });
});
