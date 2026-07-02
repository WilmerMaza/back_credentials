import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "crypto";
import { CookieOptions, Response } from "express";
import { CSRF_COOKIE_NAME } from "./csrf.constants";

@Injectable()
export class CsrfService {
  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    const flag = this.configService.get<string>("CSRF_ENABLED");
    if (flag === "false") {
      return false;
    }
    return true;
  }

  generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  getCookieOptions(): CookieOptions {
    const nodeEnv = this.configService.get<string>("NODE_ENV") ?? "development";
    const sameSite = (this.configService.get<string>("AUTH_COOKIE_SAMESITE") ??
      "lax") as "lax" | "strict" | "none";
    const secureEnv = this.configService.get<string>("AUTH_COOKIE_SECURE");
    const secure =
      secureEnv === "true" ||
      (secureEnv !== "false" && (nodeEnv === "production" || sameSite === "none"));
    const domain =
      this.configService.get<string>("AUTH_COOKIE_DOMAIN")?.trim() || undefined;

    return {
      httpOnly: false,
      secure,
      sameSite,
      domain,
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    };
  }

  issueToken(response: Response): string {
    const token = this.generateToken();
    response.cookie(CSRF_COOKIE_NAME, token, this.getCookieOptions());
    return token;
  }

  clearToken(response: Response): void {
    const { maxAge: _maxAge, ...options } = this.getCookieOptions();
    response.clearCookie(CSRF_COOKIE_NAME, options);
  }

  validate(cookieToken: string | undefined, headerToken: string | undefined): boolean {
    if (!cookieToken || !headerToken) {
      return false;
    }

    return cookieToken === headerToken;
  }
}
