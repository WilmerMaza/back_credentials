import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Res,
} from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { existsSync } from "fs";
import { join } from "path";
import { Throttle } from "@nestjs/throttler";
import { THROTTLE_AUTH } from "../../common/config/throttle.config";
import { PublicCredentialVerificationDto } from "../application/dto/public-credential-verification.dto";
import { VerifyCredentialQueryDto } from "../application/dto/verify-credential-query.dto";
import { VerifyCredentialQuery } from "../application/queries/verify-credential.query";

@ApiTags("verify")
@Controller("verify")
export class CredentialVerifyController {
  constructor(private readonly queryBus: QueryBus) {}

  @Throttle(THROTTLE_AUTH)
  @Get()
  @ApiOkResponse({ type: PublicCredentialVerificationDto })
  async verify(
    @Query() query: VerifyCredentialQueryDto,
  ): Promise<PublicCredentialVerificationDto> {
    return this.queryBus.execute(
      new VerifyCredentialQuery(query.identity.trim(), query.type.trim()),
    );
  }

  @Get("photo/:filename")
  async servePhoto(
    @Param("filename") filename: string,
    @Res() res: Response,
  ) {
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
