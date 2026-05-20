import { Credential } from "./credential.entity";

export interface CreateCredentialData {
  person: {
    fullName: string;
    typeIdentity: string;
    identityNumber: string;
    birthDate: Date;
    institutionalEmail: string;
  };
  credentialTypeCode: string;
  rank?: string | null;
  unit?: string | null;

  imagePath: string;
}

export interface CredentialRepository {
  create(data: CreateCredentialData): Promise<Credential>;
  findById(id: string): Promise<Credential | null>;
  findAll(page?: number, limit?: number): Promise<{ data: Credential[], total: number }>;
}

export const CREDENTIAL_REPOSITORY = "CREDENTIAL_REPOSITORY";
