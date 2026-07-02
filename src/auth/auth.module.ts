import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./application/auth.service";
import { SessionService } from "./application/session.service";
import { AuthController } from "./infrastructure/auth.controller";
import { USER_REPOSITORY } from "./domain/user.repository";
import { SESSION_REPOSITORY } from "./domain/session.repository";
import { UserPrismaRepository } from "./infrastructure/user-prisma.repository";
import { SessionPrismaRepository } from "./infrastructure/session-prisma.repository";
import { JwtStrategy } from "./infrastructure/strategies/jwt.strategy";
import { RefreshTokenGuard } from "./infrastructure/guards/refresh-token.guard";
import { PrismaModule } from "../prisma/prisma.module";

function parseAccessTtl(config: ConfigService): string {
  return config.get<string>("JWT_ACCESS_TTL") ?? "15m";
}

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET") ?? "fallback-secret",
        signOptions: {
          expiresIn: parseAccessTtl(configService) as `${number}${"s" | "m" | "h" | "d"}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    JwtStrategy,
    RefreshTokenGuard,
    {
      provide: USER_REPOSITORY,
      useClass: UserPrismaRepository,
    },
    {
      provide: SESSION_REPOSITORY,
      useClass: SessionPrismaRepository,
    },
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
