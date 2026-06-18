import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from '../../../domain/credential.repository';
import { Credential } from '../../../domain/credential.entity';
import { CredentialNotificationService } from '../../services/credential-notification.service';
import { CreateCredentialCommand } from '../create-credential.command';

@CommandHandler(CreateCredentialCommand)
export class CreateCredentialHandler
  implements ICommandHandler<CreateCredentialCommand>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
    private readonly notificationService: CredentialNotificationService,
  ) {}

  async execute(command: CreateCredentialCommand): Promise<Credential> {
    const credential = await this.repository.create(command.data, command.actor);
    this.notificationService.scheduleCredentialEmail(credential);
    return credential;
  }
}
