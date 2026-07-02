import { CreateSessionData, Session } from "./session.entity";

export interface SessionRepository {
  create(data: CreateSessionData): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByRefreshTokenHash(hash: string): Promise<Session | null>;
  findActiveByUserId(userId: string): Promise<Session[]>;
  revokeById(id: string): Promise<void>;
  revokeByFamilyId(familyId: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
  touch(id: string): Promise<void>;
}

export const SESSION_REPOSITORY = "SESSION_REPOSITORY";
