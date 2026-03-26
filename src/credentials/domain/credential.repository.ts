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
  rank: string;
  unit: string;

  imagePath: string;
}

export interface CredentialRepository {
  create(data: CreateCredentialData): Promise<Credential>;
  findById(id: string): Promise<Credential | null>;
  findAll(): Promise<Credential[]>;
}

export const CREDENTIAL_REPOSITORY = "CREDENTIAL_REPOSITORY";
