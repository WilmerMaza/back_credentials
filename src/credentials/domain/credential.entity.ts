export interface Credential {
  id: string;
  person: {
    fullName: string;
    typeIdentity: string;
    identityNumber: string;
    birthDate: Date;
    institutionalEmail: string | null;
  };
  type: {
    code: string;
    name: string;
  };
  rank: string | null;
  unit: string | null;
  imagePath: string | null;
  issueDate: Date | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUSPENDED';
  createdAt: Date;
  updatedAt: Date;
}
