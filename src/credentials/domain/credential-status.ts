export const CREDENTIAL_STATUSES = [
  "ACTIVE",
  "PENDING",
  "EXPIRED",
  "TRANSFERRED",
  "REVOKED",
  "SUSPENDED",
] as const;

export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export const DEFAULT_CREDENTIAL_STATUS: CredentialStatus = "PENDING";

const STATUS_ALIASES: Record<string, CredentialStatus> = {
  ACTIVE: "ACTIVE",
  ACTIVO: "ACTIVE",
  ACTIVA: "ACTIVE",
  PENDING: "PENDING",
  PENDIENTE: "PENDING",
  EXPIRED: "EXPIRED",
  EXPIRADO: "EXPIRED",
  EXPIRADA: "EXPIRED",
  INACTIVE: "EXPIRED",
  INACTIVO: "EXPIRED",
  INACTIVA: "EXPIRED",
  TRANSFERRED: "TRANSFERRED",
  TRASLADADO: "TRANSFERRED",
  TRASLADADA: "TRANSFERRED",
  REVOKED: "REVOKED",
  REVOCADO: "REVOKED",
  REVOCADA: "REVOKED",
  SUSPENDED: "SUSPENDED",
  SUSPENDIDO: "SUSPENDED",
  SUSPENDIDA: "SUSPENDED",
};

export function normalizeCredentialStatus(
  raw?: string,
  defaultStatus?: CredentialStatus,
): CredentialStatus | undefined {
  if (!raw?.trim()) {
    return defaultStatus;
  }

  const normalized = STATUS_ALIASES[raw.trim().toUpperCase()];
  if (!normalized) {
    throw new Error(
      `Estado de credencial inválido: "${raw}". Valores permitidos: ${CREDENTIAL_STATUSES.join(", ")}`,
    );
  }

  return normalized;
}

/** Valores del enum Prisma para filtrar por estado (acepta alias del front). */
export function mapStatusToDbValues(raw: string): CredentialStatus[] {
  const normalized = normalizeCredentialStatus(raw);
  if (!normalized) {
    return [];
  }

  return [normalized];
}
