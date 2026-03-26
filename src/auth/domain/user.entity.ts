export interface User {
  id: string;
  email: string;
  passwordHash: string;
  personId?: string;
}
