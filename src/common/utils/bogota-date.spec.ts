import {
  calendarDateInBogota,
  isCredentialExpired,
  startOfDayBogota,
} from "./bogota-date";

describe("bogota-date", () => {
  describe("calendarDateInBogota", () => {
    it("formatea la fecha en zona America/Bogota", () => {
      const instant = new Date("2024-06-24T10:00:00-05:00");
      expect(calendarDateInBogota(instant)).toBe("2024-06-24");
    });
  });

  describe("isCredentialExpired", () => {
    it("retorna false sin fecha de expiración", () => {
      expect(isCredentialExpired(null)).toBe(false);
      expect(isCredentialExpired(undefined)).toBe(false);
    });

    it("marca vencida una credencial ACTIVE con fecha de ayer", () => {
      const now = new Date("2024-06-25T15:00:00-05:00");
      const expirationDate = new Date("2024-06-24T23:59:59-05:00");

      expect(isCredentialExpired(expirationDate, now)).toBe(true);
    });

    it("mantiene vigente una credencial ACTIVE con fecha de hoy", () => {
      const now = new Date("2024-06-24T23:59:00-05:00");
      const expirationDate = new Date("2024-06-24T00:00:00-05:00");

      expect(isCredentialExpired(expirationDate, now)).toBe(false);
    });

    it("compara por día calendario aunque expirationDate venga en UTC", () => {
      const now = new Date("2024-06-25T01:00:00-05:00");
      const expirationDate = new Date("2024-06-24T00:00:00.000Z");

      expect(isCredentialExpired(expirationDate, now)).toBe(true);
    });
  });

  describe("startOfDayBogota", () => {
    it("devuelve medianoche en Bogotá para la fecha de referencia", () => {
      const ref = new Date("2024-06-24T18:30:00-05:00");
      const start = startOfDayBogota(ref);

      expect(calendarDateInBogota(start)).toBe("2024-06-24");
      expect(start.toISOString()).toBe("2024-06-24T05:00:00.000Z");
    });
  });
});
