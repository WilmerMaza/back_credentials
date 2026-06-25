import {
  CredentialMetadata,
  LEGACY_METADATA_ALIASES,
} from "../../domain/credential-type-schema";

const ARMY_OFFICER_GRADES = new Set([
  "Subteniente",
  "Teniente",
  "Capitan",
  "Mayor",
  "Teniente coronel",
  "Coronel de infantería",
  "Brigadier General",
  "Mayor General",
  "General de ejército",
]);

const ARMY_SUBOFFICER_GRADES = new Set([
  "Cabo tercero",
  "Cabo Segundo",
  "Cabo Primero",
  "Sargento Segundo",
  "Sargento Viceprimero",
  "Sargento primero",
  "Sargento Mayor",
  "Sargento mayor de comando",
  "Sargento Mayor de Comando Conjunto",
]);

const AIR_FORCE_OFFICER_GRADES = new Set([
  "Subteniente",
  "Teniente",
  "Capitan de infantería",
  "Mayor",
  "Teniente coronel",
  "Coronel de infantería",
  "Brigadier General",
  "Mayor General",
  "General del Aire",
]);

const AIR_FORCE_SUBOFFICER_GRADES = new Set([
  "Aerotécnico",
  "Técnico Cuarto",
  "Técnico Tercero",
  "Técnico Segundo",
  "Técnico Primero",
  "Técnico Subjefe",
  "Técnico jefe",
  "Técnico jefe de comando",
]);

function resolveLegacyMilitarCategory(
  category: unknown,
  grades: unknown,
): string | undefined {
  if (typeof category !== "string" || typeof grades !== "string") {
    return undefined;
  }

  if (category === "Army") {
    if (ARMY_OFFICER_GRADES.has(grades)) {
      return "ArmyOfficer";
    }
    if (ARMY_SUBOFFICER_GRADES.has(grades)) {
      return "ArmySubofficer";
    }
  }

  if (category === "AirForce") {
    if (AIR_FORCE_OFFICER_GRADES.has(grades)) {
      return "OfficerAir";
    }
    if (AIR_FORCE_SUBOFFICER_GRADES.has(grades)) {
      return "SubofficerAir";
    }
  }

  return undefined;
}

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

  const legacyCategory = resolveLegacyMilitarCategory(
    result.category,
    result.grades,
  );
  if (legacyCategory) {
    result.category = legacyCategory;
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
