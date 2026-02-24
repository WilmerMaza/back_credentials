import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from '../../../domain/credential.repository';
import { Credential } from '../../../domain/credential.entity';
import { CreateCredentialCommand } from '../create-credential.command';

@CommandHandler(CreateCredentialCommand)
export class CreateCredentialHandler
  implements ICommandHandler<CreateCredentialCommand>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  async execute(command: CreateCredentialCommand): Promise<Credential> {
    return this.repository.create(command.data);
  }
}
