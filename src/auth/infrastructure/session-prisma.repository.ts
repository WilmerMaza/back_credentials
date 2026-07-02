import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateSessionData, Session } from "../domain/session.entity";
import { SessionRepository } from "../domain/session.repository";

function toDomain(row: {
  id: string;
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date;
}): Session {
  return { ...row };
}

@Injectable()
export class SessionPrismaRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSessionData): Promise<Session> {
    const created = await this.prisma.session.create({
      data: {
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        familyId: data.familyId,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        expiresAt: data.expiresAt,
      },
    });

    return toDomain(created);
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    const found = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hash },
    });

    return found ? toDomain(found) : null;
  }

  async findById(id: string): Promise<Session | null> {
    const found = await this.prisma.session.findUnique({ where: { id } });
    return found ? toDomain(found) : null;
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const now = new Date();
    const items = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastUsedAt: "desc" },
    });

    return items.map(toDomain);
  }

  async revokeById(id: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByFamilyId(familyId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async touch(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }
}
