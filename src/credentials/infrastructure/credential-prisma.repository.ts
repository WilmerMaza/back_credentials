import {
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { CredentialStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MetadataSchemaValidator } from "../application/services/metadata-schema.validator";
import {
  CreateCredentialData,
  CredentialRepository,
  CredentialStatusSummary,
  UpdateCredentialData,
} from "../domain/credential.repository";
import { Credential, CredentialType } from "../domain/credential.entity";
import { CredentialTypeSchema } from "../domain/credential-type-schema";
import {
  toCredentialType,
  toDomain,
} from "./mappers/credential.mapper";

@Injectable()
export class CredentialPrismaRepository implements CredentialRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataValidator: MetadataSchemaValidator,
  ) {}

  async create(data: CreateCredentialData): Promise<Credential> {
    const credentialType = await this.prisma.credentialType.upsert({
      where: { code: data.credentialTypeCode },
      update: {},
      create: {
        code: data.credentialTypeCode,
        name: data.credentialTypeCode,
        schema: { fields: [] },
      },
    });

    const validatedMetadata = this.metadataValidator.validate(
      credentialType.schema as unknown as CredentialTypeSchema,
      data.metadata ?? {},
    );

    const person = await this.prisma.person.upsert({
      where: { identityNumber: data.person.identityNumber },
      create: {
        firstName: data.person.firstName,
        lastName: data.person.lastName,
        fullName: data.person.fullName,
        typeIdentity: data.person.typeIdentity,
        identityNumber: data.person.identityNumber,
        birthDate: data.person.birthDate,
        institutionalEmail: data.person.institutionalEmail,
      },
      update: {
        firstName: data.person.firstName,
        lastName: data.person.lastName,
        fullName: data.person.fullName,
        typeIdentity: data.person.typeIdentity,
        birthDate: data.person.birthDate,
        institutionalEmail: data.person.institutionalEmail,
      },
    });

    const created = await this.prisma.credential.create({
      data: {
        details: data.details,
        metadata: validatedMetadata as Prisma.InputJsonValue,
        imagePath: data.imagePath,
        expirationDate: data.expirationDate ?? undefined,
        person: { connect: { id: person.id } },
        credentialType: {
          connect: { id: credentialType.id },
        },
      },
      include: {
        person: true,
        credentialType: true,
      },
    });

    return toDomain(created);
  }

  async update(
    id: string,
    data: UpdateCredentialData,
  ): Promise<Credential | null> {
    const existing = await this.prisma.credential.findUnique({
      where: { id },
      include: {
        person: true,
        credentialType: true,
      },
    });

    if (!existing) {
      return null;
    }

    const credentialType = await this.prisma.credentialType.findUnique({
      where: { code: data.credentialTypeCode },
    });

    if (!credentialType) {
      throw new ConflictException(
        `Credential type "${data.credentialTypeCode}" not found`,
      );
    }

    const validatedMetadata = this.metadataValidator.validate(
      credentialType.schema as unknown as CredentialTypeSchema,
      data.metadata ?? {},
    );

    if (data.person.identityNumber !== existing.person.identityNumber) {
      const identityConflict = await this.prisma.person.findUnique({
        where: { identityNumber: data.person.identityNumber },
      });

      if (identityConflict && identityConflict.id !== existing.personId) {
        throw new ConflictException(
          "Identity number already registered for another person",
        );
      }
    }

    const nextEmail = data.person.institutionalEmail?.trim().toLowerCase() ?? null;
    const currentEmail = existing.person.institutionalEmail?.trim().toLowerCase() ?? null;

    if (nextEmail && nextEmail !== currentEmail) {
      const emailConflict = await this.prisma.person.findUnique({
        where: { institutionalEmail: nextEmail },
      });

      if (emailConflict && emailConflict.id !== existing.personId) {
        throw new ConflictException(
          "Institutional email already registered for another person",
        );
      }
    }

    const updated = await this.prisma.credential.update({
      where: { id },
      data: {
        details: data.details,
        metadata: validatedMetadata as Prisma.InputJsonValue,
        expirationDate: data.expirationDate ?? undefined,
        imagePath: data.imagePath ?? existing.imagePath ?? undefined,
        ...(data.status ? { status: data.status as CredentialStatus } : {}),
        credentialType: {
          connect: { id: credentialType.id },
        },
        person: {
          update: {
            firstName: data.person.firstName,
            lastName: data.person.lastName,
            fullName: data.person.fullName,
            typeIdentity: data.person.typeIdentity,
            identityNumber: data.person.identityNumber,
            birthDate: data.person.birthDate,
            institutionalEmail: data.person.institutionalEmail,
          },
        },
      },
      include: {
        person: true,
        credentialType: true,
      },
    });

    return toDomain(updated);
  }

  async findById(id: string): Promise<Credential | null> {
    const found = await this.prisma.credential.findUnique({
      where: { id },
      include: {
        person: true,
        credentialType: true,
      },
    });

    return found ? toDomain(found) : null;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Credential[]; total: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.credential.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          person: true,
          credentialType: true,
        },
      }),
      this.prisma.credential.count(),
    ]);

    return {
      data: items.map((item) => toDomain(item)),
      total,
    };
  }

  async countByStatus(): Promise<CredentialStatusSummary> {
    const groups = await this.prisma.credential.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const summary: CredentialStatusSummary = {
      activas: 0,
      inactivas: 0,
      pendientes: 0,
    };

    for (const group of groups) {
      const count = group._count.status;

      switch (group.status) {
        case CredentialStatus.ACTIVE:
          summary.activas += count;
          break;
        case CredentialStatus.PENDING:
          summary.pendientes += count;
          break;
        case CredentialStatus.EXPIRED:
        case CredentialStatus.REVOKED:
        case CredentialStatus.SUSPENDED:
          summary.inactivas += count;
          break;
      }
    }

    return summary;
  }

  async findAllTypes(): Promise<CredentialType[]> {
    const types = await this.prisma.credentialType.findMany({
      orderBy: { name: "asc" },
    });

    return types.map(toCredentialType);
  }

  async findTypeByCode(code: string): Promise<CredentialType | null> {
    const found = await this.prisma.credentialType.findUnique({
      where: { code },
    });

    return found ? toCredentialType(found) : null;
  }
}
