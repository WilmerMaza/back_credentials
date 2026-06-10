import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
  CredentialStatusSummary,
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

  async execute(query: ListCredentialsQuery): Promise<{
    data: Credential[];
    total: number;
    summary: CredentialStatusSummary;
  }> {
    const [listResult, summary] = await Promise.all([
      this.repository.findAll(query.page, query.limit),
      this.repository.countByStatus(),
    ]);

    return {
      ...listResult,
      summary,
    };
  }
}
