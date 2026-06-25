import { UpdateCredentialData } from "../../domain/credential.repository";
import { AuditActor } from "../../domain/credential-audit.types";

export class UpdateCredentialCommand {
  constructor(
    readonly id: string,
    readonly data: UpdateCredentialData,
    readonly actor: AuditActor,
  ) {}
}
