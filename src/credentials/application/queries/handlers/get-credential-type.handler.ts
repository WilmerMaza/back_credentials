import { Inject } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from "../../../domain/credential.repository";
import { CredentialType } from "../../../domain/credential.entity";
import { GetCredentialTypeQuery } from "../get-credential-type.query";

@QueryHandler(GetCredentialTypeQuery)
export class GetCredentialTypeHandler
  implements IQueryHandler<GetCredentialTypeQuery>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  async execute(query: GetCredentialTypeQuery): Promise<CredentialType | null> {
    return this.repository.findTypeByCode(query.code);
  }
}
