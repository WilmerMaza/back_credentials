import {
  DraftCredentialFields,
  emptyToUndefined,
} from "../../domain/credential-draft";

export interface CredentialFormAliases extends DraftCredentialFields {
  details?: string;
  metadata?: string;
  tipoIdentidad?: string;
  tipoDocumento?: string;
  documentType?: string;
  numeroIdentidad?: string;
  numeroDocumento?: string;
}

function readIdentityFromObject(
  source: Record<string, unknown>,
): { typeIdentity?: string; identityNumber?: string } {
  const typeIdentity =
    emptyToUndefined(String(source.typeIdentity ?? "")) ??
    emptyToUndefined(String(source.tipoIdentidad ?? "")) ??
    emptyToUndefined(String(source.tipoDocumento ?? "")) ??
    emptyToUndefined(String(source.documentType ?? ""));

  const identityNumber =
    emptyToUndefined(String(source.identityNumber ?? "")) ??
    emptyToUndefined(String(source.numeroIdentidad ?? "")) ??
    emptyToUndefined(String(source.numeroDocumento ?? "")) ??
    emptyToUndefined(String(source.documentNumber ?? ""));

  return { typeIdentity, identityNumber };
}

function readIdentityFromJson(raw?: string): {
  typeIdentity?: string;
  identityNumber?: string;
} {
  if (!raw?.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const root = parsed as Record<string, unknown>;
    const nested =
      root.common && typeof root.common === "object" && !Array.isArray(root.common)
        ? (root.common as Record<string, unknown>)
        : undefined;

    const rootFields = readIdentityFromObject(root);
    const nestedFields = nested ? readIdentityFromObject(nested) : {};

    return {
      typeIdentity: rootFields.typeIdentity ?? nestedFields.typeIdentity,
      identityNumber: rootFields.identityNumber ?? nestedFields.identityNumber,
    };
  } catch {
    return {};
  }
}

export function normalizeCredentialFormFields(
  input: CredentialFormAliases,
): CredentialFormAliases {
  const fromDetails = readIdentityFromJson(input.details);
  const fromMetadata = readIdentityFromJson(input.metadata);

  const typeIdentity =
    emptyToUndefined(input.typeIdentity) ??
    emptyToUndefined(input.tipoIdentidad) ??
    emptyToUndefined(input.tipoDocumento) ??
    emptyToUndefined(input.documentType) ??
    fromDetails.typeIdentity ??
    fromMetadata.typeIdentity;

  const identityNumber =
    emptyToUndefined(input.identityNumber) ??
    emptyToUndefined(input.numeroIdentidad) ??
    emptyToUndefined(input.numeroDocumento) ??
    fromDetails.identityNumber ??
    fromMetadata.identityNumber;

  return {
    ...input,
    ...(typeIdentity !== undefined ? { typeIdentity } : {}),
    ...(identityNumber !== undefined ? { identityNumber } : {}),
  };
}
