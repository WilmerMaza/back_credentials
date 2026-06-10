export interface PersonRepository {
  existsByInstitutionalEmail(email: string): Promise<boolean>;
  existsByIdentityNumber(identityNumber: string): Promise<boolean>;
}

export const PERSON_REPOSITORY = "PERSON_REPOSITORY";
