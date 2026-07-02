import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { CsrfGuard } from './common/csrf/csrf.guard';
import { CsrfModule } from './common/csrf/csrf.module';
import { createThrottleConfig } from './common/config/throttle.config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CredentialsModule } from './credentials/credentials.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CsrfModule,
    ThrottlerModule.forRoot(createThrottleConfig()),
    CqrsModule,
    PrismaModule,
    AuthModule,
    CredentialsModule,
    MailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
