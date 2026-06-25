import {
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { CredentialStatus, Prisma } from "@prisma/client";
import { startOfDayBogota } from "../../common/utils/bogota-date";
import { CredentialStatus, CredentialAuditAction, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MetadataSchemaValidator } from "../application/services/metadata-schema.validator";
import { toCredentialAuditSnapshot } from "../application/utils/credential-audit.snapshot";
import {
  CreateCredentialData,
  CredentialRepository,
  CredentialStatusSummary,
  UpdateCredentialData,
} from "../domain/credential.repository";
import { AuditActor, CredentialAuditLogEntry } from "../domain/credential-audit.types";
import { Credential, CredentialType } from "../domain/credential.entity";
import { applyExpirationToStatus } from "../domain/credential-expiration";
import {
  DEFAULT_CREDENTIAL_STATUS,
  mapStatusToDbValues,
} from "../domain/credential-status";
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

  async expireActiveCredentials(): Promise<number> {
    const updated = await this.prisma.$executeRaw`
      UPDATE "Credential"
      SET
        status = 'EXPIRED'::"CredentialStatus",
        "updatedAt" = NOW()
      WHERE status = 'ACTIVE'::"CredentialStatus"
        AND "expirationDate" IS NOT NULL
        AND ("expirationDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota')::date
            < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date
    `;

    return Number(updated);
  }

  async create(data: CreateCredentialData): Promise<Credential> {
  async create(data: CreateCredentialData, actor: AuditActor): Promise<Credential> {
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
      { allowPartial: data.isDraft },
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

    const status = applyExpirationToStatus(
      data.status ?? DEFAULT_CREDENTIAL_STATUS,
      data.expirationDate,
    );

    const created = await this.prisma.credential.create({
      data: {
        details: data.details,
        metadata: validatedMetadata as Prisma.InputJsonValue,
        imagePath: data.imagePath ?? undefined,
        expirationDate: data.expirationDate ?? undefined,
        status,
        person: { connect: { id: person.id } },
        credentialType: {
          connect: { id: credentialType.id },
    const created = await this.prisma.$transaction(async (tx) => {
      const credential = await tx.credential.create({
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

      const domainCredential = toDomain(credential);

      await tx.credentialAuditLog.create({
        data: {
          credentialId: credential.id,
          action: CredentialAuditAction.CREATE,
          userId: actor.userId,
          userEmail: actor.email,
          after: toCredentialAuditSnapshot(domainCredential) as Prisma.InputJsonValue,
        },
      });

      return domainCredential;
    });

    return created;
  }

  async update(
    id: string,
    data: UpdateCredentialData,
    actor: AuditActor,
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

    const credentialType = data.isDraft
      ? await this.prisma.credentialType.upsert({
          where: { code: data.credentialTypeCode },
          update: {},
          create: {
            code: data.credentialTypeCode,
            name: data.credentialTypeCode,
            schema: { fields: [] },
          },
        })
      : await this.prisma.credentialType.findUnique({
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
      { allowPartial: data.isDraft },
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

    const nextStatus = data.status
      ? applyExpirationToStatus(
          data.status,
          data.expirationDate ?? existing.expirationDate,
        )
      : undefined;

    const updated = await this.prisma.credential.update({
      where: { id },
      data: {
        details: data.details,
        metadata: validatedMetadata as Prisma.InputJsonValue,
        expirationDate: data.expirationDate ?? undefined,
        imagePath: data.imagePath ?? existing.imagePath ?? undefined,
        ...(nextStatus ? { status: nextStatus } : {}),
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
    const beforeSnapshot = toCredentialAuditSnapshot(toDomain(existing));

    const updated = await this.prisma.$transaction(async (tx) => {
      const credential = await tx.credential.update({
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

      const domainCredential = toDomain(credential);

      await tx.credentialAuditLog.create({
        data: {
          credentialId: credential.id,
          action: CredentialAuditAction.UPDATE,
          userId: actor.userId,
          userEmail: actor.email,
          before: beforeSnapshot as Prisma.InputJsonValue,
          after: toCredentialAuditSnapshot(domainCredential) as Prisma.InputJsonValue,
        },
      });

      return domainCredential;
    });

    return updated;
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

  async findByIdentityAndType(
    identityNumber: string,
    credentialTypeCode: string,
  ): Promise<Credential | null> {
    const normalizedIdentity = identityNumber.trim();
    const normalizedType = credentialTypeCode.trim().toLowerCase();

    if (!normalizedIdentity || !normalizedType) {
      return null;
    }

    const found = await this.prisma.credential.findFirst({
      where: {
        person: {
          identityNumber: {
            equals: normalizedIdentity,
            mode: "insensitive",
          },
        },
        credentialType: {
          code: {
            equals: normalizedType,
            mode: "insensitive",
          },
        },
      },
      orderBy: { createdAt: "desc" },
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
    status?: string,
  ): Promise<{ data: Credential[]; total: number }> {
    const where = this.buildStatusWhere(status);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.credential.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          person: true,
          credentialType: true,
        },
      }),
      this.prisma.credential.count({ where }),
    ]);

    return {
      data: items.map((item) => toDomain(item)),
      total,
    };
  }

  private buildStatusWhere(
    status?: string,
  ): Prisma.CredentialWhereInput | undefined {
    if (!status?.trim()) {
      return undefined;
    }

    const values = mapStatusToDbValues(status);
    if (values.length === 0) {
      return undefined;
    }

    if (values.includes("EXPIRED")) {
      return {
        OR: [
          { status: CredentialStatus.EXPIRED },
          {
            status: CredentialStatus.ACTIVE,
            expirationDate: { lt: startOfDayBogota() },
          },
        ],
      };
    }

    return { status: { in: values } };
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
      expiradas: 0,
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
          summary.expiradas += count;
          summary.inactivas += count;
          break;
        case CredentialStatus.TRANSFERRED:
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

  async findAuditLogsByCredentialId(
    credentialId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: CredentialAuditLogEntry[]; total: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.credentialAuditLog.findMany({
        where: { credentialId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.credentialAuditLog.count({ where: { credentialId } }),
    ]);

    return {
      data: items.map((item) => ({
        id: item.id,
        credentialId: item.credentialId,
        action: item.action,
        userId: item.userId,
        userEmail: item.userEmail,
        before: item.before as Record<string, unknown> | null,
        after: item.after as Record<string, unknown>,
        createdAt: item.createdAt,
      })),
      total,
    };
  }
}
