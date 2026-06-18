import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { PrismaModule } from "../prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { CreateCredentialHandler } from "./application/commands/handlers/create-credential.handler";
import { UpdateCredentialHandler } from "./application/commands/handlers/update-credential.handler";
import { MetadataSchemaValidator } from "./application/services/metadata-schema.validator";
import { CredentialPdfGenerator } from "./application/services/credential-pdf.generator";
import { CredentialNotificationService } from "./application/services/credential-notification.service";
import { CheckEmailExistsHandler } from "./application/queries/handlers/check-email-exists.handler";
import { CheckIdentityExistsHandler } from "./application/queries/handlers/check-identity-exists.handler";
import { VerifyCredentialHandler } from "./application/queries/handlers/verify-credential.handler";
import { GetCredentialAuditLogsHandler } from "./application/queries/handlers/get-credential-audit-logs.handler";
import { GetCredentialHandler } from "./application/queries/handlers/get-credential.handler";
import { GetCredentialTypeHandler } from "./application/queries/handlers/get-credential-type.handler";
import { ListCredentialTypesHandler } from "./application/queries/handlers/list-credential-types.handler";
import { ListCredentialsHandler } from "./application/queries/handlers/list-credentials.handler";
import { CREDENTIAL_REPOSITORY } from "./domain/credential.repository";
import { PERSON_REPOSITORY } from "./domain/person.repository";
import { CredentialPrismaRepository } from "./infrastructure/credential-prisma.repository";
import { CredentialTypesController } from "./infrastructure/credential-types.controller";
import { CredentialsController } from "./infrastructure/credentials.controller";
import { PersonPrismaRepository } from "./infrastructure/person-prisma.repository";
import { UploadsController } from "./infrastructure/uploads.controller";
import { CredentialVerifyController } from "./infrastructure/credential-verify.controller";
import { ValidationsController } from "./infrastructure/validations.controller";
import { LocalFileService } from "./infrastructure/storage/local-file.service";

const CommandHandlers = [CreateCredentialHandler, UpdateCredentialHandler];
const QueryHandlers = [
  GetCredentialHandler,
  GetCredentialAuditLogsHandler,
  ListCredentialsHandler,
  ListCredentialTypesHandler,
  GetCredentialTypeHandler,
  CheckEmailExistsHandler,
  CheckIdentityExistsHandler,
  VerifyCredentialHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule, MailModule],
  controllers: [
    CredentialsController,
    CredentialTypesController,
    ValidationsController,
    UploadsController,
    CredentialVerifyController,
  ],
  providers: [
    LocalFileService,
    MetadataSchemaValidator,
    CredentialPdfGenerator,
    CredentialNotificationService,
    CredentialPrismaRepository,
    PersonPrismaRepository,
    {
      provide: CREDENTIAL_REPOSITORY,
      useExisting: CredentialPrismaRepository,
    },
    {
      provide: PERSON_REPOSITORY,
      useExisting: PersonPrismaRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class CredentialsModule {}
