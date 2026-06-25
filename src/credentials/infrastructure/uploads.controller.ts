import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { existsSync } from "fs";
import { join } from "path";
import { SkipThrottle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../auth/infrastructure/guards/jwt-auth.guard";

@SkipThrottle()
@Controller("uploads/credentials")
export class UploadsController {
  @Get(":filename")
  @UseGuards(JwtAuthGuard) // 🔒 Added security: Only authenticated users can access the credential images!
  async serveImage(
    @Param("filename") filename: string,
    @Res() res: Response,
  ) {
    // 🔒 Security: Prevent directory traversal attacks
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      throw new BadRequestException("Invalid filename");
    }

    const filePath = join(process.cwd(), "uploads/credentials", filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException("Image not found");
    }

    res.sendFile(filePath);
  }
}
