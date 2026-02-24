import { Credential as PrismaCredential } from '@prisma/client';
import { Credential } from '../../domain/credential.entity';

export function toDomain(model: PrismaCredential): Credential {
  return {
    id: model.id,
    fullName: model.fullName,
    rank: model.rank,
    identityNumber: model.identityNumber,
    unit: model.unit,
    birthDate: model.birthDate,
    enlistmentDate: model.enlistmentDate,
    institutionalEmail: model.institutionalEmail,
    imagePath: model.imagePath,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}
