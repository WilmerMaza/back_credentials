import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from '../../../domain/credential.repository';
import { Credential } from '../../../domain/credential.entity';
import { ListCredentialsQuery } from '../list-credentials.query';

@QueryHandler(ListCredentialsQuery)
export class ListCredentialsHandler
  implements IQueryHandler<ListCredentialsQuery>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  async execute(query: ListCredentialsQuery): Promise<{ data: Credential[], total: number }> {
    return this.repository.findAll(query.page, query.limit);
  }
}
