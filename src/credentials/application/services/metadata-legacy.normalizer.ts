import {
  CredentialMetadata,
  LEGACY_METADATA_ALIASES,
} from "../../domain/credential-type-schema";

export function normalizeLegacyInput(
  metadata: CredentialMetadata,
): CredentialMetadata {
  const result = { ...metadata };

  for (const [alias, canonical] of Object.entries(LEGACY_METADATA_ALIASES)) {
    if (result[alias] !== undefined && result[canonical] === undefined) {
      result[canonical] = result[alias];
    }
    delete result[alias];
  }

  return result;
}

export function normalizeLegacyOutput(
  metadata: CredentialMetadata,
): CredentialMetadata {
  const result = { ...metadata };

  for (const alias of Object.keys(LEGACY_METADATA_ALIASES)) {
    delete result[alias];
  }

  return result;
}
