import { Credential } from './credential.entity';

export type CreateCredentialData = Omit<
  Credential,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface CredentialRepository {
  create(data: CreateCredentialData): Promise<Credential>;
  findById(id: string): Promise<Credential | null>;
  findAll(): Promise<Credential[]>;
}

export const CREDENTIAL_REPOSITORY = 'CREDENTIAL_REPOSITORY';
