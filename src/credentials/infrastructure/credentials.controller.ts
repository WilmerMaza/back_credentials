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
import { GetCredentialQuery } from "../application/queries/get-credential.query";
import { ListCredentialsQuery } from "../application/queries/list-credentials.query";
import {
  CreateCredentialData,
  UpdateCredentialData,
} from "../domain/credential.repository";
import { CredentialMetadata, normalizeCredentialTypeCode } from "../domain/credential-type-schema";
import {
  assertCompleteCredentialSubmission,
  buildPersonDataForCreate,
  buildPersonDataForUpdate,
  isCompleteCredentialSubmission,
  mergeDraftField,
  resolveCredentialTypeCode,
} from "../domain/credential-draft";
import { applyExpirationToStatus } from "../domain/credential-expiration";
import {
  CredentialStatus,
  normalizeCredentialStatus,
} from "../domain/credential-status";
import { LocalFileService } from "./storage/local-file.service";
import { multerOptions } from "./storage/multer-options";
import { normalizeCredentialFormFields } from "../application/services/credential-form-fields.normalizer";

@ApiTags("credentials")
@UseGuards(JwtAuthGuard)
@Controller("credentials")
export class CredentialsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly localFileService: LocalFileService,
  ) {}

  @Post()
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: CreateCredentialRequestDto })
  @ApiCreatedResponse({ type: CredentialResponseDto })
  @UseInterceptors(FileInterceptor("image", multerOptions))
  async create(
    @Body() dto: CreateCredentialDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CredentialResponseDto> {
    const form = normalizeCredentialFormFields(dto);
    const hasImage = Boolean(file);
    const isComplete = isCompleteCredentialSubmission(form, {
      requireImage: true,
      hasImage,
    });

    const { status: resolvedStatus, isDraft } = this.resolveSubmissionMode({
      fields: form,
      isComplete,
      explicitStatus: form.status,
      allowExplicitNonActiveOnComplete: false,
      submissionOptions: { requireImage: true, hasImage },
    });

    const expirationDate = dto.expirationDate
      ? new Date(dto.expirationDate)
      : undefined;
    const status = applyExpirationToStatus(resolvedStatus, expirationDate);

    if (!isDraft) {
      assertCompleteCredentialSubmission(form, {
        requireImage: true,
        hasImage,
      });
    }

    const credentialTypeCode = normalizeCredentialTypeCode(
      resolveCredentialTypeCode(form, undefined, isDraft),
    );

    const data: CreateCredentialData = {
      person: buildPersonDataForCreate(form, isDraft),
      credentialTypeCode,
      details: form.details?.trim() || undefined,
      metadata: this.parseMetadata(form.metadata),
      imagePath: file ? this.localFileService.toStoragePath(file) : undefined,
      expirationDate,
      status,
      isDraft,
    };

    const created = await this.commandBus.execute(
      new CreateCredentialCommand(data),
    );

    return CredentialResponseDto.fromDomain(created);
  }

  @Patch(":id")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: UpdateCredentialRequestDto })
  @ApiOkResponse({ type: CredentialResponseDto })
  @UseInterceptors(FileInterceptor("image", multerOptions))
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCredentialDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<CredentialResponseDto> {
    const form = normalizeCredentialFormFields(dto);
    const existing = await this.queryBus.execute(new GetCredentialQuery(id));
    if (!existing) {
      throw new NotFoundException("Credential not found");
    }

    const mergedFields = {
      firstName: mergeDraftField(form.firstName, existing.person.firstName),
      lastName: mergeDraftField(form.lastName, existing.person.lastName),
      identityNumber: mergeDraftField(
        form.identityNumber,
        existing.person.identityNumber,
      ),
      typeIdentity: mergeDraftField(
        form.typeIdentity,
        existing.person.typeIdentity,
      ),
      birthDate:
        mergeDraftField(
          form.birthDate,
          existing.person.birthDate.toISOString().slice(0, 10),
        ) ?? existing.person.birthDate.toISOString().slice(0, 10),
      institutionalEmail: mergeDraftField(
        form.institutionalEmail,
        existing.person.institutionalEmail ?? undefined,
      ),
      credentialTypeCode: mergeDraftField(
        form.credentialTypeCode,
        existing.type.code,
      ),
    };
    const hasImage = Boolean(file ?? existing.imagePath);
    const isComplete = isCompleteCredentialSubmission(mergedFields, {
      requireImage: true,
      hasImage,
    });

    const { status: resolvedStatus, isDraft } = this.resolveSubmissionMode({
      fields: mergedFields,
      isComplete,
      explicitStatus: form.status,
      fallbackStatus: existing.status as CredentialStatus,
      allowExplicitNonActiveOnComplete: true,
      submissionOptions: { requireImage: true, hasImage },
    });

    const expirationDate = dto.expirationDate
      ? new Date(dto.expirationDate)
      : existing.expirationDate ?? undefined;
    const status = applyExpirationToStatus(resolvedStatus, expirationDate);

    if (!isDraft) {
      assertCompleteCredentialSubmission(mergedFields, {
        requireImage: true,
        hasImage,
      });
    }

    const credentialTypeCode = normalizeCredentialTypeCode(
      resolveCredentialTypeCode(form, existing.type.code, isDraft),
    );

    const data: UpdateCredentialData = {
      person: buildPersonDataForUpdate(form, existing, isDraft),
      credentialTypeCode,
      details: form.details?.trim() || undefined,
      metadata: this.parseMetadata(form.metadata),
      imagePath: file ? this.localFileService.toStoragePath(file) : undefined,
      expirationDate,
      status,
      isDraft,
    };

    const updated = await this.commandBus.execute(
      new UpdateCredentialCommand(id, data),
    );

    return CredentialResponseDto.fromDomain(updated);
  }

  @Get(":id")
  @ApiOkResponse({ type: CredentialResponseDto })
  async get(@Param("id") id: string): Promise<CredentialResponseDto> {
    const found = await this.queryBus.execute(new GetCredentialQuery(id));
    if (!found) {
      throw new NotFoundException("Credential not found");
    }
    return CredentialResponseDto.fromDomain(found);
  }

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
        summary: { activas: 0, inactivas: 0, pendientes: 0, expiradas: 0 },
      },
    },
  })
  async list(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
  ) {
    const parsedPage = parseInt(page as string, 10);
    const parsedLimit = parseInt(limit as string, 10);
    const pageNumber = isNaN(parsedPage) ? 1 : parsedPage;
    const limitNumber = isNaN(parsedLimit) ? 10 : parsedLimit;
    const statusFilter = status?.trim() || undefined;

    if (statusFilter) {
      this.resolveStatus(statusFilter);
    }

    const result = await this.queryBus.execute(
      new ListCredentialsQuery(pageNumber, limitNumber, statusFilter),
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

  private resolveSubmissionMode(input: {
    fields: {
      firstName?: string;
      lastName?: string;
      identityNumber?: string;
      typeIdentity?: string;
      birthDate?: string;
      institutionalEmail?: string;
      credentialTypeCode?: string;
    };
    isComplete: boolean;
    explicitStatus?: string;
    fallbackStatus?: CredentialStatus;
    allowExplicitNonActiveOnComplete: boolean;
    submissionOptions: { requireImage?: boolean; hasImage?: boolean };
  }): { status: CredentialStatus; isDraft: boolean } {
    if (input.isComplete) {
      if (input.explicitStatus && input.allowExplicitNonActiveOnComplete) {
        const explicit = this.resolveStatus(input.explicitStatus);
        if (explicit !== "PENDING") {
          return { status: explicit, isDraft: false };
        }
      }

      return { status: "ACTIVE", isDraft: false };
    }

    if (input.explicitStatus) {
      const explicit = this.resolveStatus(input.explicitStatus);
      if (explicit !== "PENDING") {
        assertCompleteCredentialSubmission(
          input.fields,
          input.submissionOptions,
        );
      }
    }

    return {
      status: input.fallbackStatus ?? "PENDING",
      isDraft: true,
    };
  }

  private resolveStatus(
    raw?: string,
    defaultStatus?: CredentialStatus,
  ): CredentialStatus {
    try {
      const resolved = normalizeCredentialStatus(raw, defaultStatus);
      if (!resolved) {
        throw new Error("Estado de credencial requerido");
      }
      return resolved;
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Estado de credencial inválido",
      );
    }
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
