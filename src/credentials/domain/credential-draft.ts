import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { normalizePersonData } from "../../common/utils/person-data.normalizer";
import { Credential } from "./credential.entity";
import {
  CredentialStatus,
  DEFAULT_CREDENTIAL_STATUS,
  normalizeCredentialStatus,
} from "./credential-status";
import { CredentialPersonData } from "./credential.repository";

export const DRAFT_CREDENTIAL_TYPE_CODE = "borrador";
const DRAFT_BIRTH_DATE = new Date("1970-01-01T00:00:00.000Z");
const DRAFT_BIRTH_DATE_ISO = DRAFT_BIRTH_DATE.toISOString();

export interface DraftCredentialFields {
  firstName?: string;
  lastName?: string;
  identityNumber?: string;
  typeIdentity?: string;
  birthDate?: string;
  institutionalEmail?: string;
  credentialTypeCode?: string;
  status?: string;
}

export function emptyToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function mergeDraftField(
  incoming?: string,
  existing?: string,
): string | undefined {
  return emptyToUndefined(incoming) ?? emptyToUndefined(existing);
}

export function isDraftPlaceholderIdentity(identityNumber?: string): boolean {
  const value = emptyToUndefined(identityNumber);
  return !value || value.startsWith("DRAFT-");
}

export function isDraftPlaceholderBirthDate(birthDate?: string | Date): boolean {
  if (!birthDate) {
    return true;
  }

  const iso =
    birthDate instanceof Date
      ? birthDate.toISOString()
      : new Date(birthDate).toISOString();

  return iso.startsWith(DRAFT_BIRTH_DATE_ISO.slice(0, 10));
}

export function resolveIsDraft(
  rawStatus?: string,
  fallbackStatus: CredentialStatus = DEFAULT_CREDENTIAL_STATUS,
): boolean {
  try {
    const status = rawStatus
      ? normalizeCredentialStatus(rawStatus, DEFAULT_CREDENTIAL_STATUS)
      : fallbackStatus;
    return status === "PENDING";
  } catch {
    return false;
  }
}

export function isCompleteCredentialSubmission(
  input: DraftCredentialFields,
  options: { requireImage?: boolean; hasImage?: boolean } = {},
): boolean {
  if (!emptyToUndefined(input.firstName)) return false;
  if (!emptyToUndefined(input.lastName)) return false;
  if (isDraftPlaceholderIdentity(input.identityNumber)) return false;
  if (!emptyToUndefined(input.typeIdentity)) return false;
  if (isDraftPlaceholderBirthDate(input.birthDate)) return false;
  if (!emptyToUndefined(input.institutionalEmail)) return false;
  if (!emptyToUndefined(input.credentialTypeCode)) return false;
  if (options.requireImage && !options.hasImage) return false;
  return true;
}

export function assertCompleteCredentialSubmission(
  input: DraftCredentialFields,
  options: { requireImage?: boolean; hasImage?: boolean } = {},
): void {
  const errors: string[] = [];

  if (!emptyToUndefined(input.firstName)) {
    errors.push("firstName is required");
  }
  if (!emptyToUndefined(input.lastName)) {
    errors.push("lastName is required");
  }
  if (isDraftPlaceholderIdentity(input.identityNumber)) {
    errors.push("identityNumber is required");
  }
  if (!emptyToUndefined(input.typeIdentity)) {
    errors.push("typeIdentity is required");
  }
  if (isDraftPlaceholderBirthDate(input.birthDate)) {
    errors.push("birthDate is required");
  }
  if (!emptyToUndefined(input.institutionalEmail)) {
    errors.push("institutionalEmail is required");
  }
  if (!emptyToUndefined(input.credentialTypeCode)) {
    errors.push("credentialTypeCode is required");
  }
  if (options.requireImage && !options.hasImage) {
    errors.push("image is required");
  }

  if (errors.length > 0) {
    throw new BadRequestException(errors);
  }
}

export function buildPersonDataForCreate(
  input: DraftCredentialFields,
  isDraft: boolean,
): CredentialPersonData {
  const identityNumber =
    emptyToUndefined(input.identityNumber) ??
    (isDraft ? `DRAFT-${randomUUID()}` : "");

  const normalized = normalizePersonData({
    firstName: emptyToUndefined(input.firstName) ?? "",
    lastName: emptyToUndefined(input.lastName) ?? "",
    typeIdentity: emptyToUndefined(input.typeIdentity) ?? "",
    identityNumber,
    institutionalEmail: emptyToUndefined(input.institutionalEmail) ?? "",
  });

  return {
    ...normalized,
    birthDate: input.birthDate ? new Date(input.birthDate) : DRAFT_BIRTH_DATE,
    institutionalEmail: normalized.institutionalEmail || null,
  };
}

export function buildPersonDataForUpdate(
  input: DraftCredentialFields,
  existing: Credential,
  isDraft: boolean,
): CredentialPersonData {
  const identityNumber =
    mergeDraftField(input.identityNumber, existing.person.identityNumber) ??
    existing.person.identityNumber;

  const normalized = normalizePersonData({
    firstName:
      mergeDraftField(input.firstName, existing.person.firstName) ?? "",
    lastName: mergeDraftField(input.lastName, existing.person.lastName) ?? "",
    typeIdentity:
      mergeDraftField(input.typeIdentity, existing.person.typeIdentity) ?? "",
    identityNumber:
      mergeDraftField(input.identityNumber, existing.person.identityNumber) ??
      existing.person.identityNumber,
    institutionalEmail:
      mergeDraftField(
        input.institutionalEmail,
        existing.person.institutionalEmail ?? undefined,
      ) ?? "",
  });

  return {
    ...normalized,
    birthDate: input.birthDate
      ? new Date(input.birthDate)
      : existing.person.birthDate,
    institutionalEmail: normalized.institutionalEmail || null,
  };
}

export function resolveCredentialTypeCode(
  input: DraftCredentialFields,
  fallback?: string,
  isDraft = false,
): string {
  return (
    emptyToUndefined(input.credentialTypeCode) ??
    fallback ??
    (isDraft ? DRAFT_CREDENTIAL_TYPE_CODE : "")
  );
}
