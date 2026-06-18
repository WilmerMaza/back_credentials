import { Credential, CredentialType } from "./credential.entity";
import { CredentialMetadata } from "./credential-type-schema";
import { AuditActor, CredentialAuditLogEntry } from "./credential-audit.types";

export interface CredentialPersonData {
  firstName: string;
  lastName: string;
  fullName: string;
  typeIdentity: string;
  identityNumber: string;
  birthDate: Date;
  institutionalEmail: string;
}

export interface CreateCredentialData {
  person: CredentialPersonData;
  credentialTypeCode: string;
  details?: string | null;
  metadata?: CredentialMetadata;
  imagePath: string;
  expirationDate?: Date | null;
}

export interface UpdateCredentialData {
  person: CredentialPersonData;
  credentialTypeCode: string;
  details?: string | null;
  metadata?: CredentialMetadata;
  imagePath?: string;
  expirationDate?: Date | null;
  status?: string;
}

export interface CredentialStatusSummary {
  activas: number;
  inactivas: number;
  pendientes: number;
}

export interface CredentialRepository {
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
