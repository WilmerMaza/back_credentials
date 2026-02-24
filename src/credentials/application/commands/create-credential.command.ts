import { CreateCredentialData } from '../../domain/credential.repository';

export class CreateCredentialCommand {
  constructor(public readonly data: CreateCredentialData) {}
}
