import { Inject } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from "../../../domain/credential.repository";
import { PublicCredentialVerificationDto } from "../../dto/public-credential-verification.dto";
import { VerifyCredentialQuery } from "../verify-credential.query";

@QueryHandler(VerifyCredentialQuery)
export class VerifyCredentialHandler
  implements IQueryHandler<VerifyCredentialQuery>
{
  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  async execute(
    query: VerifyCredentialQuery,
  ): Promise<PublicCredentialVerificationDto> {
    const checkedAt = new Date();
    const credential = await this.repository.findByIdentityAndType(
      query.identityNumber,
      query.credentialTypeCode,
    );

    if (!credential) {
      return PublicCredentialVerificationDto.notFound(checkedAt);
    }

    return PublicCredentialVerificationDto.fromCredential(credential, checkedAt);
  }
}
