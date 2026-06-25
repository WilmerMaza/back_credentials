import { applyExpirationToStatus } from "./credential-expiration";

describe("applyExpirationToStatus", () => {
  const now = new Date("2024-06-25T12:00:00-05:00");

  it("cambia ACTIVE a EXPIRED cuando la vigencia ya pasó", () => {
    const expirationDate = new Date("2024-06-24T00:00:00-05:00");

    expect(applyExpirationToStatus("ACTIVE", expirationDate, now)).toBe(
      "EXPIRED",
    );
  });

  it("no cambia PENDING aunque la fecha esté vencida", () => {
    const expirationDate = new Date("2024-06-24T00:00:00-05:00");

    expect(applyExpirationToStatus("PENDING", expirationDate, now)).toBe(
      "PENDING",
    );
  });

  it("mantiene ACTIVE si la vigencia es hoy", () => {
    const expirationDate = new Date("2024-06-25T00:00:00-05:00");

    expect(applyExpirationToStatus("ACTIVE", expirationDate, now)).toBe(
      "ACTIVE",
    );
  });

  it("no altera estados inactivos distintos de ACTIVE", () => {
    const expirationDate = new Date("2024-06-24T00:00:00-05:00");

    expect(applyExpirationToStatus("REVOKED", expirationDate, now)).toBe(
      "REVOKED",
    );
  });
});
