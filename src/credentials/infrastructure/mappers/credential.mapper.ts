import {
  Credential as PrismaCredential,
  CredentialType as PrismaCredentialType,
  Person as PrismaPerson,
  Prisma,
} from "@prisma/client";
import { Credential, CredentialType } from "../../domain/credential.entity";
import { CredentialMetadata } from "../../domain/credential-type-schema";
import { normalizeLegacyOutput } from "../../application/services/metadata-legacy.normalizer";

export type CredentialWithRelations = PrismaCredential & {
  person: PrismaPerson;
  credentialType: PrismaCredentialType;
};

export function toMetadata(value: Prisma.JsonValue): CredentialMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as CredentialMetadata;
}

export function toDomain(model: CredentialWithRelations): Credential {
  return {
    id: model.id,
    person: {
      firstName: model.person.firstName,
      lastName: model.person.lastName,
      fullName: model.person.fullName,
      typeIdentity: model.person.typeIdentity,
      identityNumber: model.person.identityNumber,
      birthDate: model.person.birthDate,
      institutionalEmail: model.person.institutionalEmail,
    },
    type: {
      code: model.credentialType.code,
      name: model.credentialType.name,
      schema: model.credentialType.schema as Record<string, unknown>,
    },
    details: model.details,
    metadata: normalizeLegacyOutput(toMetadata(model.metadata)),
    imagePath: model.imagePath,
    issueDate: model.issueDate,
    expirationDate: model.expirationDate,
    status: model.status as Credential["status"],
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

export function toCredentialType(model: PrismaCredentialType): CredentialType {
  return {
    id: model.id,
    code: model.code,
    name: model.name,
    description: model.description,
    schema: model.schema as Record<string, unknown>,
    createdAt: model.createdAt,
  };
}
