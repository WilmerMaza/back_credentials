import {
  Credential as PrismaCredential,
  Person as PrismaPerson,
  CredentialType as PrismaCredentialType,
} from '@prisma/client';
import { Credential } from '../../domain/credential.entity';

export type CredentialWithRelations = PrismaCredential & {
  person: PrismaPerson;
  credentialType: PrismaCredentialType;
};

export function toDomain(model: CredentialWithRelations): Credential {
  return {
    id: model.id,
    person: {
      fullName: model.person.fullName,
      typeIdentity: model.person.typeIdentity,
      identityNumber: model.person.identityNumber,
      birthDate: model.person.birthDate,
      institutionalEmail: model.person.institutionalEmail,
    },
    type: {
      code: model.credentialType.code,
      name: model.credentialType.name,
    },
    rank: model.rank,
    unit: model.unit,
    details: model.details,
    force: model.force,
    sport: model.sport,
    course: model.course,
    grades: model.grades,
    imagePath: model.imagePath,
    issueDate: model.issueDate,
    status: model.status as any,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}
