export interface Session {
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
}

export interface CreateSessionData {
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
}
