import { CredentialListFilters } from "../../domain/credential.repository";

export class ListCredentialsQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly filters?: CredentialListFilters,
  ) {}
}
