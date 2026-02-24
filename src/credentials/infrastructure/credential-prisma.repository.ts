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
    const created = await this.prisma.credential.create({ data });
    return toDomain(created);
  }

  async findById(id: string): Promise<Credential | null> {
    const found = await this.prisma.credential.findUnique({ where: { id } });
    return found ? toDomain(found) : null;
  }

  async findAll(): Promise<Credential[]> {
    const items = await this.prisma.credential.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return items.map(toDomain);
  }
}
