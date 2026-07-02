import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes, randomUUID } from "crypto";
import {
  SESSION_REPOSITORY,
  SessionRepository,
} from "../domain/session.repository";

export interface SessionRequestMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface CreatedSessionTokens {
  rawRefreshToken: string;
  sessionId: string;
  familyId: string;
}

export interface RotatedSessionTokens {
  userId: string;
  rawRefreshToken: string;
  sessionId: string;
}

export interface SessionSummary {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  current: boolean;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    private readonly configService: ConfigService,
  ) {}

  generateRefreshToken(): string {
    return randomBytes(32).toString("base64url");
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private getRefreshExpiresAt(): Date {
    const days = Number(this.configService.get<string>("REFRESH_TOKEN_TTL_DAYS") ?? "7");
    const ttlDays = Number.isFinite(days) ? days : 7;
    return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  }

  async createSession(
    userId: string,
    meta: SessionRequestMeta = {},
  ): Promise<CreatedSessionTokens> {
    const rawRefreshToken = this.generateRefreshToken();
    const familyId = randomUUID();

    const session = await this.sessionRepository.create({
      userId,
      refreshTokenHash: this.hashToken(rawRefreshToken),
      familyId,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt: this.getRefreshExpiresAt(),
    });

    return {
      rawRefreshToken,
      sessionId: session.id,
      familyId,
    };
  }

  async rotateRefreshToken(
    rawToken: string,
    meta: SessionRequestMeta = {},
  ): Promise<RotatedSessionTokens | null> {
    const hash = this.hashToken(rawToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(hash);

    if (!session) {
      return null;
    }

    if (session.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for family ${session.familyId}`,
      );
      await this.sessionRepository.revokeByFamilyId(session.familyId);
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.sessionRepository.revokeById(session.id);
      return null;
    }

    await this.sessionRepository.revokeById(session.id);

    const rawRefreshToken = this.generateRefreshToken();
    const rotated = await this.sessionRepository.create({
      userId: session.userId,
      refreshTokenHash: this.hashToken(rawRefreshToken),
      familyId: session.familyId,
      userAgent: meta.userAgent ?? session.userAgent,
      ipAddress: meta.ipAddress ?? session.ipAddress,
      expiresAt: this.getRefreshExpiresAt(),
    });

    return {
      userId: session.userId,
      rawRefreshToken,
      sessionId: rotated.id,
    };
  }

  async revokeByToken(rawToken: string): Promise<void> {
    const hash = this.hashToken(rawToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(hash);
    if (session && !session.revokedAt) {
      await this.sessionRepository.revokeById(session.id);
    }
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllByUserId(userId);
  }

  async validateRefreshToken(
    rawToken: string,
  ): Promise<{ userId: string; sessionId: string } | null> {
    const hash = this.hashToken(rawToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(hash);

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    await this.sessionRepository.touch(session.id);
    return { userId: session.userId, sessionId: session.id };
  }

  async findSessionIdByRefreshToken(rawToken: string): Promise<string | null> {
    const hash = this.hashToken(rawToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(hash);
    return session?.id ?? null;
  }

  async listActiveSessions(
    userId: string,
    currentSessionId?: string | null,
  ): Promise<SessionSummary[]> {
    const sessions = await this.sessionRepository.findActiveByUserId(userId);

    return sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      current: currentSessionId ? session.id === currentSessionId : false,
    }));
  }

  async revokeSessionForUser(
    sessionId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<boolean> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.revokedAt) {
      return false;
    }

    if (!isAdmin && session.userId !== requesterId) {
      return false;
    }

    await this.sessionRepository.revokeById(sessionId);
    return true;
  }
}
