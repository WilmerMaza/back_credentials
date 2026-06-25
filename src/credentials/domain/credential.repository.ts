import { Credential, CredentialType } from "./credential.entity";
import { CredentialMetadata } from "./credential-type-schema";
import { CredentialStatus } from "./credential-status";
import { AuditActor, CredentialAuditLogEntry } from "./credential-audit.types";

export interface CredentialPersonData {
  firstName: string;
  lastName: string;
  fullName: string;
  typeIdentity: string;
  identityNumber: string;
  birthDate: Date;
  institutionalEmail: string | null;
}

export interface CreateCredentialData {
  person: CredentialPersonData;
  credentialTypeCode: string;
  details?: string | null;
  metadata?: CredentialMetadata;
  imagePath?: string;
  expirationDate?: Date | null;
  status?: CredentialStatus;
  isDraft?: boolean;
}

export interface UpdateCredentialData {
  person: CredentialPersonData;
  credentialTypeCode: string;
  details?: string | null;
  metadata?: CredentialMetadata;
  imagePath?: string;
  expirationDate?: Date | null;
  status?: CredentialStatus;
  isDraft?: boolean;
}

export interface CredentialStatusSummary {
  activas: number;
  inactivas: number;
  pendientes: number;
  expiradas: number;
}

export interface CredentialRepository {
  expireActiveCredentials(): Promise<number>;
  create(data: CreateCredentialData): Promise<Credential>;
  update(id: string, data: UpdateCredentialData): Promise<Credential | null>;
  create(data: CreateCredentialData, actor: AuditActor): Promise<Credential>;
  update(
    id: string,
    data: UpdateCredentialData,
    actor: AuditActor,
  ): Promise<Credential | null>;
  findById(id: string): Promise<Credential | null>;
  findByIdentityAndType(
    identityNumber: string,
    credentialTypeCode: string,
  ): Promise<Credential | null>;
  findAll(
    page?: number,
    limit?: number,
    status?: string,
  ): Promise<{ data: Credential[]; total: number }>;
  countByStatus(): Promise<CredentialStatusSummary>;
  findAllTypes(): Promise<CredentialType[]>;
  findTypeByCode(code: string): Promise<CredentialType | null>;
  findAuditLogsByCredentialId(
    credentialId: string,
    page?: number,
    limit?: number,
  ): Promise<{ data: CredentialAuditLogEntry[]; total: number }>;
}

export const CREDENTIAL_REPOSITORY = "CREDENTIAL_REPOSITORY";
