export interface AuditActor {
  userId: string;
  email: string;
}

export type CredentialAuditAction = "CREATE" | "UPDATE";

export interface CredentialAuditLogEntry {
  id: string;
  credentialId: string;
  action: CredentialAuditAction;
  userId: string | null;
  userEmail: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  createdAt: Date;
}
