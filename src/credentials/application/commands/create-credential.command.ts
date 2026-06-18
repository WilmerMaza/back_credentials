import { CreateCredentialData } from '../../domain/credential.repository';
import { AuditActor } from '../../domain/credential-audit.types';

export class CreateCredentialCommand {
  constructor(
    public readonly data: CreateCredentialData,
    public readonly actor: AuditActor,
  ) {}
}
