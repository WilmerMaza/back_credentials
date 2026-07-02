import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "../application/auth.service";
import { isAdminUser } from "../application/admin-auth.helper";
import { Response, Request } from "express";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { THROTTLE_AUTH } from "../../common/config/throttle.config";
import { SkipCsrf } from "../../common/csrf/skip-csrf.decorator";
import { CsrfService } from "../../common/csrf/csrf.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RefreshTokenGuard } from "./guards/refresh-token.guard";
import { REFRESH_TOKEN_COOKIE } from "../domain/auth-cookie.config";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly csrfService: CsrfService,
    private readonly configService: ConfigService,
  ) {}

  @SkipCsrf()
  @SkipThrottle()
  @Get("csrf")
  getCsrf(@Res({ passthrough: true }) response: Response) {
    const csrfToken = this.csrfService.issueToken(response);
    return { csrfToken };
  }

  @SkipCsrf()
  @Throttle(THROTTLE_AUTH)
  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const result = await this.authService.login(user, req, response);
    const csrfToken = this.csrfService.issueToken(response);
    return { ...result, csrfToken };
  }

  @SkipCsrf()
  @Throttle(THROTTLE_AUTH)
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@Req() req: { user: { userId: string } }) {
    return this.authService.findById(req.user.userId);
  }

  @SkipThrottle()
  @UseGuards(RefreshTokenGuard)
  @SkipCsrf()
  @Get("session")
  async getSession(@Req() req: { user: { userId: string } }) {
    return {
      active: true,
      userId: req.user.userId,
    };
  }

  @SkipThrottle()
  @UseGuards(RefreshTokenGuard)
  @SkipCsrf()
  @Post("refresh")
  async refresh(
    @Req() req: Request & { refreshToken?: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refresh(req.refreshToken!, req, response);
  }

  @SkipThrottle()
  @Post("logout")
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    const result = await this.authService.logout(refreshToken, response);
    this.csrfService.clearToken(response);
    return result;
  }

  @Throttle(THROTTLE_AUTH)
  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  async changePassword(
    @Req() req: { user: { userId: string } },
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
      response,
    );
    this.csrfService.clearToken(response);
    return result;
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  async listSessions(@Req() req: Request & { user: { userId: string } }) {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
    return this.authService.listSessions(req.user.userId, refreshToken);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:id")
  async revokeSession(
    @Param("id") sessionId: string,
    @Req() req: { user: { userId: string } },
  ) {
    const isAdmin = isAdminUser(this.configService, req.user.userId);
    return this.authService.revokeSession(sessionId, req.user.userId, isAdmin);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get("admin/sessions/:userId")
  async adminListSessions(
    @Param("userId") userId: string,
    @Req() req: { user: { userId: string } },
  ) {
    if (!isAdminUser(this.configService, req.user.userId)) {
      throw new ForbiddenException("Admin access required");
    }

    return this.authService.listSessions(userId);
  }
}
