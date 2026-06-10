import { Inject, NotFoundException } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from "../../../domain/credential.repository";
import { Credential } from "../../../domain/credential.entity";
import { UpdateCredentialCommand } from "../update-credential.command";

@CommandHandler(UpdateCredentialCommand)
export class UpdateCredentialHandler
  implements ICommandHandler<UpdateCredentialCommand>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  async execute(command: UpdateCredentialCommand): Promise<Credential> {
    const updated = await this.repository.update(command.id, command.data);
    if (!updated) {
      throw new NotFoundException("Credential not found");
    }

    return updated;
  }
}
