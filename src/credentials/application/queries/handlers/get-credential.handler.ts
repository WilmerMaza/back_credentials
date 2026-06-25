import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from '../../../domain/credential.repository';
import { Credential } from '../../../domain/credential.entity';
import { GetCredentialQuery } from '../get-credential.query';

@QueryHandler(GetCredentialQuery)
export class GetCredentialHandler
  implements IQueryHandler<GetCredentialQuery>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  async execute(query: GetCredentialQuery): Promise<Credential | null> {
    await this.repository.expireActiveCredentials();
    return this.repository.findById(query.id);
  }
}
