import { CredentialMetadata } from "./credential-type-schema";
import { CredentialStatus } from "./credential-status";

export interface Credential {
  id: string;
  person: {
    firstName: string;
    lastName: string;
    fullName: string;
    typeIdentity: string;
    identityNumber: string;
    birthDate: Date;
    institutionalEmail: string | null;
  };
  type: {
    code: string;
    name: string;
    schema?: Record<string, unknown>;
  };
  details: string | null;
  metadata: CredentialMetadata;
  imagePath: string | null;
  issueDate: Date | null;
  expirationDate: Date | null;
  status: CredentialStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  schema: Record<string, unknown>;
  createdAt: Date;
}
