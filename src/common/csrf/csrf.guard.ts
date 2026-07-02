import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf.constants";
import { CsrfService } from "./csrf.service";
import { SKIP_CSRF_KEY } from "./skip-csrf.decorator";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly csrfService: CsrfService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.csrfService.isEnabled()) {
      return true;
    }

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const cookieToken = request.cookies?.[CSRF_COOKIE_NAME] as string | undefined;
    const headerValue = request.headers[CSRF_HEADER_NAME];
    const headerToken = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!this.csrfService.validate(cookieToken, headerToken)) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}
