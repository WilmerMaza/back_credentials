const BOGOTA_TIME_ZONE = "America/Bogota";

const bogotaCalendarFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOGOTA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha calendario YYYY-MM-DD en zona America/Bogota. */
export function calendarDateInBogota(date: Date): string {
  return bogotaCalendarFormatter.format(date);
}

/** Inicio del día calendario actual (o de `ref`) en Bogotá, como instante UTC. */
export function startOfDayBogota(ref: Date = new Date()): Date {
  const day = calendarDateInBogota(ref);
  return new Date(`${day}T00:00:00-05:00`);
}

/**
 * Vigencia por día calendario en Bogotá: vence cuando el día de expiración
 * es anterior al día actual (no por hora del servidor).
 */
export function isCredentialExpired(
  expirationDate: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expirationDate) {
    return false;
  }

  return (
    calendarDateInBogota(expirationDate) < calendarDateInBogota(now)
  );
}
