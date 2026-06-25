import { Inject, NotFoundException } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CredentialAuditLogEntry } from "../../../domain/credential-audit.types";
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from "../../../domain/credential.repository";
import { GetCredentialAuditLogsQuery } from "../get-credential-audit-logs.query";

@QueryHandler(GetCredentialAuditLogsQuery)
export class GetCredentialAuditLogsHandler
  implements IQueryHandler<GetCredentialAuditLogsQuery>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  async execute(
    query: GetCredentialAuditLogsQuery,
  ): Promise<{ data: CredentialAuditLogEntry[]; total: number }> {
    const credential = await this.repository.findById(query.credentialId);
    if (!credential) {
      throw new NotFoundException("Credential not found");
    }

    return this.repository.findAuditLogsByCredentialId(
      query.credentialId,
      query.page,
      query.limit,
    );
  }
}
