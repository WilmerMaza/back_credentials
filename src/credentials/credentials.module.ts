import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { PrismaModule } from "../prisma/prisma.module";
import { CreateCredentialHandler } from "./application/commands/handlers/create-credential.handler";
import { UpdateCredentialHandler } from "./application/commands/handlers/update-credential.handler";
import { MetadataSchemaValidator } from "./application/services/metadata-schema.validator";
import { CheckEmailExistsHandler } from "./application/queries/handlers/check-email-exists.handler";
import { CheckIdentityExistsHandler } from "./application/queries/handlers/check-identity-exists.handler";
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
import { ValidationsController } from "./infrastructure/validations.controller";
import { LocalFileService } from "./infrastructure/storage/local-file.service";

const CommandHandlers = [CreateCredentialHandler, UpdateCredentialHandler];
const QueryHandlers = [
  GetCredentialHandler,
  ListCredentialsHandler,
  ListCredentialTypesHandler,
  GetCredentialTypeHandler,
  CheckEmailExistsHandler,
  CheckIdentityExistsHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [
    CredentialsController,
    CredentialTypesController,
    ValidationsController,
    UploadsController,
  ],
  providers: [
    LocalFileService,
    MetadataSchemaValidator,
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
