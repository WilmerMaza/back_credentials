export type CredentialFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "email"
  | "select"
  | "radio"
  | "checkbox"
  | "boolean";

export interface CredentialFieldSchema {
  name: string;
  label: string;
  type: CredentialFieldType;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
}

export interface CredentialTypeSchema {
  fields: CredentialFieldSchema[];
}

export type CredentialMetadata = Record<string, unknown>;
