import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "../application/auth.service";
import { Response } from "express";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ApiTags } from "@nestjs/swagger";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { THROTTLE_AUTH } from "../../common/config/throttle.config";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(THROTTLE_AUTH)
  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.authService.login(user, response);
  }

  @Throttle(THROTTLE_AUTH)
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@Req() req: any) {
    return this.authService.findById(req.user.userId);
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post("refresh")
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.findById(req.user.userId);
    if (!user) throw new UnauthorizedException();
    return this.authService.login(user, response);
  }

  @SkipThrottle()
  @Post("logout")
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie("access_token");
    return { message: "Logged out" };
  }
}
