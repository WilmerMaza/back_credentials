import { UpdateCredentialData } from "../../domain/credential.repository";

export class UpdateCredentialCommand {
  constructor(
    readonly id: string,
    readonly data: UpdateCredentialData,
  ) {}
}
