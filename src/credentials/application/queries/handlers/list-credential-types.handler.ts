import { Inject } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from "../../../domain/credential.repository";
import { CredentialType } from "../../../domain/credential.entity";
import { ListCredentialTypesQuery } from "../list-credential-types.query";

@QueryHandler(ListCredentialTypesQuery)
export class ListCredentialTypesHandler
  implements IQueryHandler<ListCredentialTypesQuery>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  async execute(): Promise<CredentialType[]> {
    return this.repository.findAllTypes();
  }
}
