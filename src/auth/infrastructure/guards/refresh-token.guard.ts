import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { REFRESH_TOKEN_COOKIE } from "../../domain/auth-cookie.config";
import { SessionService } from "../../application/session.service";

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token required");
    }

    const session = await this.sessionService.validateRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    request.user = { userId: session.userId };
    (request as Request & { refreshToken: string }).refreshToken = refreshToken;

    return true;
  }
}
