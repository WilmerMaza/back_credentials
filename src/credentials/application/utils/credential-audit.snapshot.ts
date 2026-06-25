import { Credential } from "../../domain/credential.entity";

export function toCredentialAuditSnapshot(
  credential: Credential,
): Record<string, unknown> {
  return {
    id: credential.id,
    person: {
      firstName: credential.person.firstName,
      lastName: credential.person.lastName,
      fullName: credential.person.fullName,
      typeIdentity: credential.person.typeIdentity,
      identityNumber: credential.person.identityNumber,
      birthDate: credential.person.birthDate.toISOString(),
      institutionalEmail: credential.person.institutionalEmail,
    },
    credentialType: {
      code: credential.type.code,
      name: credential.type.name,
    },
    details: credential.details,
    metadata: credential.metadata,
    imagePath: credential.imagePath,
    issueDate: credential.issueDate?.toISOString() ?? null,
    expirationDate: credential.expirationDate?.toISOString() ?? null,
    status: credential.status,
    createdAt: credential.createdAt.toISOString(),
    updatedAt: credential.updatedAt.toISOString(),
  };
}
