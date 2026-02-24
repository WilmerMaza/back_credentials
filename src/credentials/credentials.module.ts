import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateCredentialHandler } from './application/commands/handlers/create-credential.handler';
import { GetCredentialHandler } from './application/queries/handlers/get-credential.handler';
import { ListCredentialsHandler } from './application/queries/handlers/list-credentials.handler';
import { CREDENTIAL_REPOSITORY } from './domain/credential.repository';
import { CredentialPrismaRepository } from './infrastructure/credential-prisma.repository';
import { CredentialsController } from './infrastructure/credentials.controller';
import { LocalFileService } from './infrastructure/storage/local-file.service';

const CommandHandlers = [CreateCredentialHandler];
const QueryHandlers = [GetCredentialHandler, ListCredentialsHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [CredentialsController],
  providers: [
    LocalFileService,
    CredentialPrismaRepository,
    {
      provide: CREDENTIAL_REPOSITORY,
      useExisting: CredentialPrismaRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class CredentialsModule {}
