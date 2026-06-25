export class GetCredentialAuditLogsQuery {
  constructor(
    readonly credentialId: string,
    readonly page: number = 1,
    readonly limit: number = 20,
  ) {}
}
