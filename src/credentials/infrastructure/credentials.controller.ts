import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { normalizePersonData } from "../../common/utils/person-data.normalizer";
import { THROTTLE_WRITE } from "../../common/config/throttle.config";
import { JwtAuthGuard } from "../../auth/infrastructure/guards/jwt-auth.guard";
import { CreateCredentialCommand } from "../application/commands/create-credential.command";
import { UpdateCredentialCommand } from "../application/commands/update-credential.command";
import {
  CreateCredentialDto,
  CreateCredentialRequestDto,
} from "../application/dto/create-credential.dto";
import {
  UpdateCredentialDto,
  UpdateCredentialRequestDto,
} from "../application/dto/update-credential.dto";
import { CredentialResponseDto } from "../application/dto/credential-response.dto";
import { CredentialAuditLogResponseDto } from "../application/dto/credential-audit-log-response.dto";
import { GetCredentialQuery } from "../application/queries/get-credential.query";
import { GetCredentialAuditLogsQuery } from "../application/queries/get-credential-audit-logs.query";
import { ListCredentialsQuery } from "../application/queries/list-credentials.query";
import { AuditActor, CredentialAuditLogEntry } from "../domain/credential-audit.types";
import {
  CreateCredentialData,
  UpdateCredentialData,
} from "../domain/credential.repository";
import { CredentialMetadata } from "../domain/credential-type-schema";
import { LocalFileService } from "./storage/local-file.service";
import { multerOptions } from "./storage/multer-options";
import { Request } from "express";

@ApiTags("credentials")
@UseGuards(JwtAuthGuard)
@Controller("credentials")
export class CredentialsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly localFileService: LocalFileService,
  ) {}

  @Throttle(THROTTLE_WRITE)
  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateCredentialRequestDto })
  @ApiCreatedResponse({ type: CredentialResponseDto })
  @UseInterceptors(FileInterceptor("image", multerOptions))
  async create(
    @Req() req: Request,
    @Body() dto: CreateCredentialDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CredentialResponseDto> {
    if (!file) {
      throw new BadRequestException("Image is required");
    }

    const normalizedPerson = normalizePersonData({
      firstName: dto.firstName,
      lastName: dto.lastName,
      typeIdentity: dto.typeIdentity,
      identityNumber: dto.identityNumber,
      institutionalEmail: dto.institutionalEmail,
    });

    const data: CreateCredentialData = {
      person: {
        ...normalizedPerson,
        birthDate: new Date(dto.birthDate),
      },
      credentialTypeCode: dto.credentialTypeCode.trim().toLowerCase(),
      details: dto.details?.trim() || undefined,
      metadata: this.parseMetadata(dto.metadata),
      imagePath: this.localFileService.toStoragePath(file),
      expirationDate: dto.expirationDate
        ? new Date(dto.expirationDate)
        : undefined,
    };

    const created = await this.commandBus.execute(
      new CreateCredentialCommand(data, this.getAuditActor(req)),
    );

    return CredentialResponseDto.fromDomain(created);
  }

  @Throttle(THROTTLE_WRITE)
  @Patch(":id")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UpdateCredentialRequestDto })
  @ApiOkResponse({ type: CredentialResponseDto })
  @UseInterceptors(FileInterceptor("image", multerOptions))
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateCredentialDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CredentialResponseDto> {
    const normalizedPerson = normalizePersonData({
      firstName: dto.firstName,
      lastName: dto.lastName,
      typeIdentity: dto.typeIdentity,
      identityNumber: dto.identityNumber,
      institutionalEmail: dto.institutionalEmail,
    });

    const data: UpdateCredentialData = {
      person: {
        ...normalizedPerson,
        birthDate: new Date(dto.birthDate),
      },
      credentialTypeCode: dto.credentialTypeCode.trim().toLowerCase(),
      details: dto.details?.trim() || undefined,
      metadata: this.parseMetadata(dto.metadata),
      imagePath: file ? this.localFileService.toStoragePath(file) : undefined,
      expirationDate: dto.expirationDate
        ? new Date(dto.expirationDate)
        : undefined,
      status: dto.status?.trim().toUpperCase(),
    };

    const updated = await this.commandBus.execute(
      new UpdateCredentialCommand(id, data, this.getAuditActor(req)),
    );

    return CredentialResponseDto.fromDomain(updated);
  }

  @SkipThrottle()
  @Get(":id/audit-logs")
  @ApiOkResponse({
    description: "Historial de auditoría de una credencial",
    schema: {
      example: {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    },
  })
  async listAuditLogs(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);
    const pageNumber = isNaN(parsedPage) ? 1 : parsedPage;
    const limitNumber = isNaN(parsedLimit) ? 20 : parsedLimit;

    const result = await this.queryBus.execute(
      new GetCredentialAuditLogsQuery(id, pageNumber, limitNumber),
    );

    return {
      data: result.data.map((entry: CredentialAuditLogEntry) =>
        CredentialAuditLogResponseDto.fromDomain(entry),
      ),
      total: result.total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(result.total / limitNumber),
    };
  }

  @SkipThrottle()
  @Get(":id")
  @ApiOkResponse({ type: CredentialResponseDto })
  async get(@Param("id") id: string): Promise<CredentialResponseDto> {
    const found = await this.queryBus.execute(new GetCredentialQuery(id));
    if (!found) {
      throw new NotFoundException("Credential not found");
    }
    return CredentialResponseDto.fromDomain(found);
  }

  @SkipThrottle()
  @Get()
  @ApiOkResponse({
    description: "Paginated list of credentials with status summary",
    schema: {
      example: {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        summary: { activas: 0, inactivas: 0, pendientes: 0 },
      },
    },
  })
  async list(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);
    const pageNumber = isNaN(parsedPage) ? 1 : parsedPage;
    const limitNumber = isNaN(parsedLimit) ? 10 : parsedLimit;

    const result = await this.queryBus.execute(
      new ListCredentialsQuery(pageNumber, limitNumber),
    );

    return {
      data: result.data.map((item: any) =>
        CredentialResponseDto.fromDomain(item),
      ),
      total: result.total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(result.total / limitNumber),
      summary: result.summary,
    };
  }

  private getAuditActor(req: Request): AuditActor {
    const user = req.user as { userId: string; email: string };
    return {
      userId: user.userId,
      email: user.email,
    };
  }

  private parseMetadata(raw?: string): CredentialMetadata {
    if (!raw?.trim()) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("metadata debe ser un objeto JSON");
      }

      return parsed as CredentialMetadata;
    } catch {
      throw new BadRequestException("metadata debe ser un JSON válido");
    }
  }
}
