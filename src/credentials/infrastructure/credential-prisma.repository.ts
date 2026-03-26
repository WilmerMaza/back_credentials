import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCredentialData,
  CredentialRepository,
} from '../domain/credential.repository';
import { Credential } from '../domain/credential.entity';
import { toDomain } from './mappers/credential.mapper';

@Injectable()
export class CredentialPrismaRepository implements CredentialRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCredentialData): Promise<Credential> {
    const created = await this.prisma.credential.create({
      data: {
        rank: data.rank,
        unit: data.unit,
        imagePath: data.imagePath,
        person: {
          connectOrCreate: {
            where: { identityNumber: data.person.identityNumber },
            create: {
              fullName: data.person.fullName,
              typeIdentity: data.person.typeIdentity,
              identityNumber: data.person.identityNumber,
              birthDate: data.person.birthDate,
              institutionalEmail: data.person.institutionalEmail,
            },
          },
        },
        credentialType: {
          connectOrCreate: {
            where: { code: data.credentialTypeCode },
            create: {
              code: data.credentialTypeCode,
              name: data.credentialTypeCode,
            },
          },
        },
      },
      include: {
        person: true,
        credentialType: true,
      },
    });
    return toDomain(created as any);
  }

  async findById(id: string): Promise<Credential | null> {
    const found = await this.prisma.credential.findUnique({
      where: { id },
      include: {
        person: true,
        credentialType: true,
      },
    });
    return found ? toDomain(found as any) : null;
  }

  async findAll(): Promise<Credential[]> {
    const items = await this.prisma.credential.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        person: true,
        credentialType: true,
      },
    });
    return items.map((item) => toDomain(item as any));
  }
}
