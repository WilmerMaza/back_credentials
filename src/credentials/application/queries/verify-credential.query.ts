export class VerifyCredentialQuery {
  constructor(
    public readonly identityNumber: string,
    public readonly credentialTypeCode: string,
  ) {}
}
