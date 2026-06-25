import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  CREDENTIAL_REPOSITORY,
  CredentialRepository,
} from "../domain/credential.repository";

@Injectable()
export class CredentialExpirationScheduler {
  private readonly logger = new Logger(CredentialExpirationScheduler.name);

  constructor(
    @Inject(CREDENTIAL_REPOSITORY)
    private readonly repository: CredentialRepository,
  ) {}

  @Cron("5 0 * * *", { timeZone: "America/Bogota" })
  async expireStaleCredentials(): Promise<void> {
    const count = await this.repository.expireActiveCredentials();
    if (count > 0) {
      this.logger.log(`Marcadas ${count} credencial(es) como EXPIRED`);
    }
  }
}
