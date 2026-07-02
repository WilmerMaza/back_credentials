import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Request, Response } from "express";
import {
  ACCESS_TOKEN_COOKIE,
  getAccessCookieOptions,
  getClearAccessCookieOptions,
  getClearRefreshCookieOptions,
  getRefreshCookieOptions,
  REFRESH_TOKEN_COOKIE,
} from "../domain/auth-cookie.config";
import { USER_REPOSITORY, UserRepository } from "../domain/user.repository";
import { RegisterDto } from "../infrastructure/dto/register.dto";
import {
  SessionRequestMeta,
  SessionService,
} from "./session.service";

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepository.findByEmail(email);

    const hashToCompare = user
      ? user.passwordHash
      : "$2b$10$r9VlO7pTf.S19v.S19v.S19v.S19v.S19v.S19v.S19v.S19v.S";

    const isMatch = await bcrypt.compare(pass, hashToCompare);

    if (user && isMatch) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async register(data: RegisterDto) {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      personId: data.personId,
    });
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) return null;
    const { passwordHash, ...result } = user;
    return result;
  }

  private getRequestMeta(req: Request): SessionRequestMeta {
    return {
      userAgent: req.headers["user-agent"] ?? null,
      ipAddress: req.ip ?? null,
    };
  }

  private signAccessToken(user: { id: string; email: string }): string {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    response.cookie(
      ACCESS_TOKEN_COOKIE,
      accessToken,
      getAccessCookieOptions(this.configService),
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      getRefreshCookieOptions(this.configService),
    );
  }

  private clearAuthCookies(response: Response): void {
    response.clearCookie(
      ACCESS_TOKEN_COOKIE,
      getClearAccessCookieOptions(this.configService),
    );
    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      getClearRefreshCookieOptions(this.configService),
    );
  }

  async login(user: any, req: Request, response: Response) {
    const { rawRefreshToken } = await this.sessionService.createSession(
      user.id,
      this.getRequestMeta(req),
    );

    const accessToken = this.signAccessToken(user);
    this.setAuthCookies(response, accessToken, rawRefreshToken);

    return {
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        personId: user.personId,
      },
    };
  }

  async refresh(refreshToken: string, req: Request, response: Response) {
    const rotated = await this.sessionService.rotateRefreshToken(
      refreshToken,
      this.getRequestMeta(req),
    );

    if (!rotated) {
      this.clearAuthCookies(response);
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const user = await this.findById(rotated.userId);
    if (!user) {
      this.clearAuthCookies(response);
      throw new UnauthorizedException("User not found");
    }

    const accessToken = this.signAccessToken(user);
    this.setAuthCookies(response, accessToken, rotated.rawRefreshToken);

    return { message: "Token refreshed" };
  }

  async logout(refreshToken: string | undefined, response: Response) {
    if (refreshToken) {
      await this.sessionService.revokeByToken(refreshToken);
    }

    this.clearAuthCookies(response);
    return { message: "Logged out" };
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionService.revokeAllByUserId(userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    response: Response,
  ) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid current password");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(userId, passwordHash);
    await this.sessionService.revokeAllByUserId(userId);
    this.clearAuthCookies(response);

    return { message: "Password changed. Please login again." };
  }

  async listSessions(userId: string, refreshToken?: string) {
    const currentSessionId = refreshToken
      ? await this.sessionService.findSessionIdByRefreshToken(refreshToken)
      : null;

    return this.sessionService.listActiveSessions(userId, currentSessionId);
  }

  async revokeSession(sessionId: string, requesterId: string, isAdmin: boolean) {
    const revoked = await this.sessionService.revokeSessionForUser(
      sessionId,
      requesterId,
      isAdmin,
    );

    if (!revoked) {
      throw new ForbiddenException("Session not found or not allowed");
    }

    return { message: "Session revoked" };
  }
}
